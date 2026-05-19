import { useState, useRef, useEffect } from 'react'
import { App } from 'antd'
import Sidebar from '../components/Sidebar'
import { sendMessageToWebhook, getConfig } from '../services/webhookService'
import { connectSSE, disconnectSSE } from '../services/sseService'
import { auth, db } from '../firebase'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'

// Parse score data from AI response
function parseScoreData(text) {
  const startMarker = '---SCORE_DATA_START---'
  const endMarker = '---SCORE_DATA_END---'
  const startIdx = text.indexOf(startMarker)
  const endIdx = text.indexOf(endMarker)
  if (startIdx === -1 || endIdx === -1) return null
  try {
    const jsonStr = text.substring(startIdx + startMarker.length, endIdx).trim()
    const data = JSON.parse(jsonStr)
    const displayText = text.substring(0, startIdx).trim()
    return { scores: data, displayText }
  } catch (e) {
    console.error('Score parse error:', e)
    return null
  }
}

export default function VoicePage({ onGoHome, onGoChat, onGoHistory, onLogout, isDark, toggleTheme }) {
  const { notification, modal } = App.useApp()
  const [mode, setMode] = useState('normal')
  const [isRecording, setIsRecording] = useState(false)
  const [micStatus, setMicStatus] = useState('idle') // 'idle', 'error', 'listening'
  const isRecordingRef = useRef(false) // ref to track recording inside callbacks
  
  // New Chat States
  const [messages, setMessages] = useState([])
  const [isStarted, setIsStarted] = useState(false)
  const [isEnded, setIsEnded] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [parsedScores, setParsedScores] = useState(null)
  const [showScoreModal, setShowScoreModal] = useState(false)
  const chatEndRef = useRef(null)
  const accumulatedTextRef = useRef('')


  
  // Device Selection States
  const [devices, setDevices] = useState([])
  const [selectedDeviceId, setSelectedDeviceId] = useState('')
  const [isTestingMic, setIsTestingMic] = useState(false)
  
  // Subtitle and Speech States
  const [subtitle, setSubtitle] = useState('')
  const [aiSubtitle, setAiSubtitle] = useState('')
  const [connectionStatus, setConnectionStatus] = useState('disconnected')
  const recognitionRef = useRef(null)
  
  const streamRef = useRef(null)
  const audioContextRef = useRef(null)
  const analyserRef = useRef(null)
  const animationFrameRef = useRef(null)
  const visualizerRef = useRef(null)
  const testVisualizerRef = useRef(null)

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, aiSubtitle, subtitle, isRecording])

  // Fetch available microphone devices
  const fetchDevices = async () => {
    try {
      // Request permission briefly to get actual device labels
      const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const devs = await navigator.mediaDevices.enumerateDevices()
      const audioDevs = devs.filter(d => d.kind === 'audioinput')
      
      setDevices(audioDevs)
      if (audioDevs.length > 0) {
        // Set to default or the first one available
        const defaultDev = audioDevs.find(d => d.deviceId === 'default')
        setSelectedDeviceId(defaultDev ? defaultDev.deviceId : audioDevs[0].deviceId)
      }
      
      // Stop temp stream immediately
      tempStream.getTracks().forEach(t => t.stop())
    } catch (err) {
      console.error('Permission denied or error fetching devices', err)
      setMicStatus('error')
    }
  }

  useEffect(() => {
    fetchDevices()
    return () => {
      stopAudioTracks()
    }
  }, [])

  // Connect to SSE on mount
  useEffect(() => {
    setConnectionStatus('connecting')
    
    connectSSE(
      (data) => {
        if (data.type === 'connected') {
          setConnectionStatus('connected')
        } else if (data.type === 'ai' && data.text) {
          const cleanText = data.text.trim()
          if (cleanText !== '' && cleanText !== 'No response text') {
            // Check for score data
            const scoreResult = parseScoreData(cleanText)
            if (scoreResult) {
              setAiSubtitle(scoreResult.displayText)
              setMessages(prev => [...prev, { type: 'ai', text: scoreResult.displayText }])
              generateVoice(scoreResult.displayText)
              setParsedScores(scoreResult.scores)
              setShowScoreModal(true)
              setIsEnded(true)
            } else {
              setAiSubtitle(cleanText)
              setMessages(prev => [...prev, { type: 'ai', text: cleanText }])
              generateVoice(cleanText)
            }
          }
        }
      },
      (error) => {
        setConnectionStatus('error')
      }
    )

    return () => {
      disconnectSSE()
    }
  }, [])

  // Save history
  useEffect(() => {
    if (isEnded && !isSaving && messages.length > 0) {
      setIsSaving(true);
      if (auth.currentUser) {
        let overall = null;
        if (parsedScores) {
          const nums = Object.values(parsedScores).filter(v => typeof v === 'number');
          if (nums.length > 0) overall = nums.reduce((a, b) => a + b, 0) / nums.length;
        }

        addDoc(collection(db, 'chatHistory'), {
          userId: auth.currentUser.uid,
          messages: messages,
          timestamp: serverTimestamp(),
          mode: mode + '-voice',
          overallScore: overall ? Math.round(overall * 10) / 10 : null
        }).then(() => {
          notification.success({
            message: 'บันทึกสำเร็จ!',
            description: 'บันทึกประวัติสนทนาด้วยเสียงเรียบร้อยแล้ว',
            placement: 'topRight',
          });
        }).catch((err) => {
          console.error('Error saving chat:', err);
        });
      }
    }
  }, [isEnded, isSaving, messages, mode, parsedScores])

  // Create a fresh SpeechRecognition instance (Chrome is unreliable when reusing)
  const createRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return null;

    const recognition = new SpeechRecognition();
    recognition.lang = 'th-TH';
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      let finalText = accumulatedTextRef.current;
      let interimText = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalText += transcript;
          accumulatedTextRef.current = finalText;
        } else {
          interimText += transcript;
        }
      }
      const display = finalText + interimText;
      setSubtitle(display);
      console.log('[STT] result:', display.slice(-80));
    };

    recognition.onend = () => {
      console.log('[STT] onend, isRecording:', isRecordingRef.current);
      // Auto-restart if still recording (Chrome stops after silence/timeout)
      if (isRecordingRef.current) {
        setTimeout(() => {
          if (isRecordingRef.current) {
            try {
              console.log('[STT] auto-restarting...');
              recognition.start();
            } catch (e) {
              console.error('[STT] restart failed, creating new instance');
              const newRec = createRecognition();
              if (newRec) {
                recognitionRef.current = newRec;
                try { newRec.start(); } catch(e2) {}
              }
            }
          }
        }, 300);
      }
    };

    recognition.onerror = (event) => {
      console.error('[STT] error:', event.error);
      if (event.error === 'not-allowed' || event.error === 'service-not-available') {
        isRecordingRef.current = false;
        setMicStatus('error');
      }
      // 'no-speech', 'aborted', 'network' are recoverable via onend auto-restart
    };

    return recognition;
  };

  const generateVoice = async (text) => {
    try {
      const response = await fetch('https://api-voice.botnoi.ai/openapi/v1/generate_audio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'botnoi-token': 'ux5D3W3WAqnLzSvUDr2K17XfkL5R4aNT'
        },
        body: JSON.stringify({
          text: text,
          speaker: '1',
          volume: 1,
          speed: 1,
          type_media: 'm4a',
          save_file: 'true',
          language: 'th'
        })
      });

      const data = await response.json();
      if (data.audio_url) {
        const audio = new Audio(data.audio_url);
        audio.play();
      }
    } catch (error) {
      console.error('Error generating voice:', error);
    }
  };

  const handleSendToAI = async (text) => {
    const config = getConfig();
    setAiSubtitle('กำลังรอคำตอบจาก AI...');
    await sendMessageToWebhook(text, mode, config.signingSecret);
  };

  // Core audio stopping logic
  const stopAudioTracks = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(console.error)
      audioContextRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
  }

  const stopInterviewMic = () => {
    // Set ref FIRST so onend won't auto-restart
    isRecordingRef.current = false;
    stopAudioTracks()
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.abort();
      } catch(e) {}
      recognitionRef.current = null;
    }
    if (visualizerRef.current) {
      visualizerRef.current.style.transform = 'scale(1)'
      visualizerRef.current.style.boxShadow = 'none'
    }
    setIsRecording(false)
    setMicStatus('idle')
    
    // Use accumulated text, not just subtitle
    const userText = (accumulatedTextRef.current || subtitle).trim();
    if (userText) {
      setMessages(prev => [...prev, { type: 'user', text: userText }]);
      handleSendToAI(userText);
    }
    // Reset accumulated text after sending
    accumulatedTextRef.current = '';
    setSubtitle('');
  }

  const handleCancelSpeech = () => {
    isRecordingRef.current = false;
    stopAudioTracks()
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.abort();
      } catch(e) {}
      recognitionRef.current = null;
    }
    if (visualizerRef.current) {
      visualizerRef.current.style.transform = 'scale(1)'
      visualizerRef.current.style.boxShadow = 'none'
    }
    setIsRecording(false)
    setMicStatus('idle')
    // Discard text
    accumulatedTextRef.current = '';
    setSubtitle('');
    notification.info({ message: 'ยกเลิกแล้ว', description: 'เริ่มพูดใหม่ได้เลย', placement: 'topRight', duration: 2 });
  }

  const stopTestMic = () => {
    stopAudioTracks()
    if (testVisualizerRef.current) {
      testVisualizerRef.current.style.width = '0%'
    }
    setIsTestingMic(false)
  }

  // Get stream with selected device
  const getAudioStream = async () => {
    const constraints = {
      audio: selectedDeviceId ? { deviceId: { exact: selectedDeviceId } } : true
    }
    return await navigator.mediaDevices.getUserMedia(constraints)
  }

  // Setup visualizer loop
  const setupAudioVisualization = async (targetRef, type) => {
    try {
      const stream = await getAudioStream()
      streamRef.current = stream
      
      const AudioContext = window.AudioContext || window.webkitAudioContext
      audioContextRef.current = new AudioContext()
      analyserRef.current = audioContextRef.current.createAnalyser()
      
      const source = audioContextRef.current.createMediaStreamSource(stream)
      source.connect(analyserRef.current)
      
      analyserRef.current.fftSize = 256
      const bufferLength = analyserRef.current.frequencyBinCount
      const dataArray = new Uint8Array(bufferLength)

      const updateVisualizer = () => {
        if (!analyserRef.current) return;
        
        analyserRef.current.getByteFrequencyData(dataArray)
        const average = dataArray.reduce((acc, val) => acc + val, 0) / bufferLength
        
        if (targetRef.current) {
          if (type === 'interview') {
            const scale = 1 + (average / 150)
            const clampedScale = Math.min(Math.max(scale, 1), 1.4)
            targetRef.current.style.transform = `scale(${clampedScale})`
            
            const glowIntensity = Math.min(average * 0.8, 100)
            targetRef.current.style.boxShadow = `0 0 ${glowIntensity}px ${glowIntensity / 3}px rgba(168, 85, 247, 0.5)`
          } else if (type === 'test') {
            const widthPct = Math.min((average / 120) * 100, 100)
            targetRef.current.style.width = `${widthPct}%`
            // Dynamic color based on volume level
            if (widthPct > 85) targetRef.current.style.backgroundColor = '#ef4444' // red
            else if (widthPct > 50) targetRef.current.style.backgroundColor = '#f59e0b' // yellow
            else targetRef.current.style.backgroundColor = '#22c55e' // green
          }
        }
        
        animationFrameRef.current = requestAnimationFrame(updateVisualizer)
      }

      updateVisualizer()
      return true
    } catch (error) {
      console.error('Error accessing microphone:', error)
      return false
    }
  }

  const startInterviewMic = async () => {
    if (!isStarted) {
      setIsStarted(true);
      // Send greeting as first message
      const modeMsg = 'สวัสดี';
      setMessages(prev => [...prev, { type: 'user', text: modeMsg }]);
      handleSendToAI(modeMsg);
    }
    isRecordingRef.current = true;
    setIsRecording(true)
    setMicStatus('listening')
    accumulatedTextRef.current = '';
    setSubtitle('')
    setAiSubtitle('')
    
    // Stop old recognition cleanly, then create a fresh instance
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.abort();
      } catch (e) {}
      recognitionRef.current = null;
    }
    const rec = createRecognition();
    recognitionRef.current = rec;
    if (rec) {
      try {
        rec.start();
        console.log('[STT] started fresh recognition');
      } catch (e) {
        console.error('[STT] start error:', e);
      }
    }

    const success = await setupAudioVisualization(visualizerRef, 'interview')
    if (!success) {
      isRecordingRef.current = false;
      setIsRecording(false)
      setMicStatus('error')
      if (recognitionRef.current) {
        try {
          recognitionRef.current.onend = null;
          recognitionRef.current.onerror = null;
          recognitionRef.current.onresult = null;
          recognitionRef.current.abort();
        } catch (e) {}
        recognitionRef.current = null;
      }
      modal.error({
        title: 'ไม่สามารถเข้าถึงไมโครโฟนได้',
        content: 'กรุณาตรวจสอบการอนุญาตใช้งานไมโครโฟนในการตั้งค่าเบราว์เซอร์ของคุณ เพื่อใช้งานระบบสัมภาษณ์ด้วยเสียง',
        okText: 'รับทราบ',
      });
    }
  }

  const startTestMic = async () => {
    setIsTestingMic(true)
    const success = await setupAudioVisualization(testVisualizerRef, 'test')
    if (!success) {
      setIsTestingMic(false)
      notification.warning({
        message: 'เชื่อมต่อไมโครโฟนไม่สำเร็จ',
        description: 'ไม่สามารถเข้าถึงไมโครโฟนตัวที่เลือกได้ กรุณาลองเลือกตัวอื่นหรือตรวจสอบการเชื่อมต่อ',
        placement: 'topRight',
      });
    }
  }

  const toggleRecording = () => {
    if (isRecording) {
      stopInterviewMic()
    } else {
      if (isTestingMic) stopTestMic() // ensure test is stopped before starting real interview
      startInterviewMic()
    }
  }

  const toggleTestMic = () => {
    if (isTestingMic) {
      stopTestMic()
    } else {
      if (isRecording) stopInterviewMic() // ensure interview is stopped before testing
      startTestMic()
    }
  }

  return (
    <div className={`flex h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-300 font-sans ${isDark ? 'dark' : ''}`}>
      <Sidebar 
        activeTab="voice" 
        onGoDashboard={onGoHome}
        onGoChat={onGoChat} 
        onGoHistory={onGoHistory}
        onLogout={onLogout}
      />

      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Top Header */}
        <header className="h-20 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-8 z-10 sticky top-0 shrink-0">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Voice Interview</h1>
          
          <div className="flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
            >
              {isDark ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4.22 4.22a1 1 0 011.415 0l.708.708a1 1 0 01-1.414 1.415l-.708-.708a1 1 0 010-1.415zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM14.636 15.636a1 1 0 010 1.415l-.707.707a1 1 0 01-1.415-1.414l.707-.707a1 1 0 011.415 0zM10 18a1 1 0 01-1-1v-1a1 1 0 112 0v1a1 1 0 01-1 1zM5.364 15.636a1 1 0 01-1.415 0l-.707-.707a1 1 0 011.414-1.415l.708.708a1 1 0 010 1.414zM4 10a1 1 0 01-1 1H2a1 1 0 110-2h1a1 1 0 011 1zM6.778 5.364a1 1 0 010-1.414l.707-.707a1 1 0 011.414 1.414l-.707.707a1 1 0 01-1.414 0zM10 5a5 5 0 100 10 5 5 0 000-10z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              )}
            </button>
            <div className="flex items-center gap-3 border-l border-gray-200 dark:border-gray-700 pl-4">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300">User</span>
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-purple-600 text-white flex items-center justify-center font-bold shadow-md">
                U
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          {/* Main Voice Area */}
          <div className="flex-1 flex flex-col bg-white dark:bg-gray-950 relative">
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {!isStarted && messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center animate-fade-in-up">
                  <div className="mb-12 relative inline-block">
                    <div className="w-40 h-40 rounded-full flex items-center justify-center text-6xl shadow-2xl relative z-10 bg-gray-100 dark:bg-gray-800 text-gray-400">
                      🎙️
                    </div>
                  </div>
                  <h2 className="text-4xl font-extrabold text-gray-900 dark:text-white mb-4">
                    Ready to speak
                  </h2>
                  <p className="text-xl text-gray-500 dark:text-gray-400 mb-8">
                    Select your microphone on the right, test it, then click "Start Speaking".
                  </p>
                </div>
              ) : (
                <div className="space-y-6 pb-20">
                  {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.type === 'ai' ? 'justify-start' : 'justify-end'}`}>
                      <div className={`max-w-[80%] lg:max-w-[70%] rounded-2xl px-6 py-4 shadow-sm ${
                        msg.type === 'ai'
                          ? 'bg-gray-100 dark:bg-gray-800/80 text-gray-800 dark:text-gray-100 rounded-tl-none'
                          : 'bg-purple-600 text-white rounded-tr-none'
                      }`}>
                        {msg.type === 'ai' && (
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center text-xs">
                              🤖
                            </div>
                            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">AI Voice</span>
                          </div>
                        )}
                        <p className="text-base leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                      </div>
                    </div>
                  ))}
                  
                  {isRecording && subtitle && (
                    <div className="flex justify-end animate-fade-in-up">
                      <div className="max-w-[80%] lg:max-w-[70%] rounded-2xl px-6 py-4 shadow-sm bg-purple-400 dark:bg-purple-500/80 text-white rounded-tr-none">
                        <p className="text-base leading-relaxed whitespace-pre-wrap italic opacity-80">
                          {subtitle}
                        </p>
                      </div>
                    </div>
                  )}

                  {aiSubtitle === 'กำลังรอคำตอบจาก AI...' && (
                    <div className="flex justify-start animate-fade-in-up">
                      <div className="bg-gray-100 dark:bg-gray-800/80 rounded-2xl rounded-tl-none px-6 py-5 shadow-sm flex gap-1.5 items-center">
                        <div className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
              )}
            </div>

            {/* Bottom Control Bar */}
            <div className="p-6 bg-white dark:bg-gray-950 border-t border-gray-100 dark:border-gray-800 shrink-0 relative flex justify-center">
              {/* Floating Visualizer when started */}
              {isStarted && (
                <div className="absolute left-1/2 -translate-x-1/2 -top-10">
                  <div className="relative">
                    {isRecording && (
                      <>
                        <div className="absolute inset-0 bg-purple-500 rounded-full animate-ping opacity-20"></div>
                        <div className="absolute -inset-4 bg-purple-400 rounded-full animate-pulse opacity-10"></div>
                      </>
                    )}
                    <div 
                      ref={visualizerRef}
                      className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl shadow-lg relative z-10 transition-colors duration-300 ${
                        isRecording 
                          ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white' 
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                      }`}
                      style={{ transition: 'transform 0.1s ease-out, background 0.3s' }}
                    >
                      🎙️
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-2 w-full max-w-2xl">
                {!isStarted && (
                  <button
                    onClick={onGoHome}
                    className="px-8 py-4 rounded-full text-lg font-bold text-gray-700 bg-gray-200 hover:bg-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition-all shadow-md hover-lift"
                  >
                    Back to Modes
                  </button>
                )}
                
                <button 
                  onClick={toggleRecording}
                  disabled={isEnded}
                  className={`px-10 py-4 rounded-full text-lg font-bold shadow-xl transition-all hover-lift flex items-center gap-3 ${
                    isRecording
                      ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/30'
                      : 'bg-purple-600 hover:bg-purple-700 text-white shadow-purple-500/30'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isRecording ? (
                    <>
                      <span className="w-4 h-4 bg-white rounded-sm animate-pulse"></span>
                      Stop Listening
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                      Start Speaking
                    </>
                  )}
                </button>

                {/* Cancel speech button - appears when recording */}
                {isRecording && (
                  <button
                    onClick={handleCancelSpeech}
                    className="w-14 h-14 rounded-full bg-gray-200 hover:bg-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 transition-all shadow-md"
                    title="ยกเลิกและพูดใหม่"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}

                {isStarted && !isEnded && !isRecording && (
                  <button
                    onClick={() => setIsEnded(true)}
                    className="px-8 py-4 bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 rounded-full text-lg font-bold transition-colors"
                  >
                    End Interview
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right Sidebar - Mode Settings */}
          <div className="w-80 border-l border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 p-6 flex flex-col shrink-0 hidden lg:flex overflow-y-auto">
            <h3 className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-6">
              Interview Settings
            </h3>

            <div className="space-y-4">
              <button
                onClick={() => !isRecording && setMode('normal')}
                className={`w-full text-left p-5 rounded-2xl transition-all border ${
                  mode === 'normal'
                    ? 'bg-white dark:bg-gray-800 border-purple-500 shadow-md ring-1 ring-purple-500'
                    : 'bg-white/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700'
                } ${isRecording ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={isRecording}
              >
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-bold text-lg text-gray-900 dark:text-white">Normal Voice</h4>
                  {mode === 'normal' && <span className="w-3 h-3 rounded-full bg-purple-500"></span>}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Relaxed practice. The AI will be friendly and accommodating.
                </p>
              </button>

              <button
                onClick={() => !isRecording && setMode('virtual')}
                className={`w-full text-left p-5 rounded-2xl transition-all border ${
                  mode === 'virtual'
                    ? 'bg-white dark:bg-gray-800 border-pink-500 shadow-md ring-1 ring-pink-500'
                    : 'bg-white/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 hover:border-pink-300 dark:hover:border-pink-700'
                } ${isRecording ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={isRecording}
              >
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-bold text-lg text-gray-900 dark:text-white">Virtual Voice</h4>
                  {mode === 'virtual' && <span className="w-3 h-3 rounded-full bg-pink-500"></span>}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Strict evaluation focusing on tone, clarity, and professionalism.
                </p>
              </button>
            </div>
            
            {/* Microphone Selection and Testing */}
            <div className="mt-8 bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700">
               <h4 className="font-bold text-sm text-gray-900 dark:text-white mb-3">Microphone Selection</h4>
               
               {micStatus === 'error' && (
                 <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs rounded-lg border border-red-100 dark:border-red-800/30">
                   Access to microphone denied. Please allow it in browser settings.
                 </div>
               )}

               <select 
                 value={selectedDeviceId} 
                 onChange={(e) => setSelectedDeviceId(e.target.value)}
                 className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm rounded-lg p-2.5 mb-4 text-gray-900 dark:text-white focus:ring-purple-500 focus:border-purple-500 outline-none"
                 disabled={isRecording || isTestingMic}
               >
                 {devices.length === 0 && <option value="">Searching for devices...</option>}
                 {devices.map(device => (
                   <option key={device.deviceId} value={device.deviceId}>
                     {device.label || `Microphone ${device.deviceId.slice(0, 5)}...`}
                   </option>
                 ))}
               </select>

               <button 
                 onClick={toggleTestMic}
                 disabled={isRecording || devices.length === 0}
                 className={`w-full py-2.5 px-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                   isTestingMic 
                     ? 'bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400' 
                     : 'bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-400'
                 } disabled:opacity-50 disabled:cursor-not-allowed`}
               >
                 {isTestingMic ? (
                   <>
                     <span className="w-2 h-2 bg-red-600 dark:bg-red-400 rounded-full animate-pulse"></span>
                     Stop Test
                   </>
                 ) : (
                   'Test Microphone'
                 )}
               </button>

               <div className={`mt-4 transition-all duration-300 overflow-hidden ${isTestingMic ? 'h-10 opacity-100' : 'h-0 opacity-0'}`}>
                 <div className="flex justify-between text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">
                   <span>Input Level</span>
                 </div>
                 <div className="w-full h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                   <div ref={testVisualizerRef} className="h-full bg-green-500 w-0" style={{ transition: 'width 0.1s ease-out, background-color 0.2s ease-out' }}></div>
                 </div>
               </div>
            </div>

          </div>
        </div>
      </main>

      {/* Score Acceptance Modal */}
      {showScoreModal && parsedScores && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-800 p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-3xl shadow-lg">🏆</div>
              <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white">ผลการสัมภาษณ์ (Voice)</h2>
              <p className="text-gray-500 mt-1">คุณต้องการรับคะแนนนี้ไหม?</p>
            </div>
            
            <div className="space-y-3 mb-6">
              {Object.entries(parsedScores).map(([key, val]) => (
                <div key={key} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                  <span className="font-semibold text-gray-700 dark:text-gray-300">{key}</span>
                  {typeof val === 'number' ? (
                    <span className={`text-lg font-extrabold ${val >= 8 ? 'text-emerald-500' : val >= 6 ? 'text-blue-500' : 'text-amber-500'}`}>{val.toFixed(1)}</span>
                  ) : (
                    <span className="text-sm text-gray-500 dark:text-gray-400 max-w-[60%] text-right">{val}</span>
                  )}
                </div>
              ))}
            </div>

            {(() => {
              const nums = Object.values(parsedScores).filter(v => typeof v === 'number')
              const avg = nums.length > 0 ? nums.reduce((a, b) => a + b, 0) / nums.length : 0
              return (
                <div className="text-center mb-6 p-4 rounded-2xl bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-800/50">
                  <span className="text-sm font-bold text-gray-500 uppercase">Overall Score</span>
                  <p className="text-4xl font-extrabold text-purple-600 dark:text-purple-400">{avg.toFixed(1)}<span className="text-lg text-gray-400">/10.0</span></p>
                </div>
              )
            })()}

            <div className="flex gap-3">
                <button onClick={() => {
                  setShowScoreModal(false)
                  notification.info({ message: 'ปฏิเสธคะแนน', description: 'คะแนนจะไม่ถูกบันทึก คุณสามารถสัมภาษณ์ใหม่ได้', placement: 'topRight' })
                }} className="flex-1 py-3 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 transition-all">
                  ❌ ปฏิเสธ
                </button>
                <button onClick={async () => {
                  if (!parsedScores || !auth.currentUser) return
                  try {
                    const numericScores = {}; let summary = ''
                    for (const [key, val] of Object.entries(parsedScores)) {
                      if (typeof val === 'number') numericScores[key] = val; else summary = val
                    }
                    const overall = Object.values(numericScores).length > 0 ? Object.values(numericScores).reduce((a, b) => a + b, 0) / Object.values(numericScores).length : 0
                    await addDoc(collection(db, 'interviewScores'), {
                      userId: auth.currentUser.uid,
                      displayName: auth.currentUser.displayName || auth.currentUser.email?.split('@')[0] || 'Unknown',
                      scores: numericScores, summary, overall: Math.round(overall * 10) / 10, mode: mode + '-voice', timestamp: serverTimestamp()
                    })
                    notification.success({ message: '✅ บันทึกคะแนนเรียบร้อย!', description: `Overall Score: ${overall.toFixed(1)}/10.0`, placement: 'topRight', duration: 6 })
                    setShowScoreModal(false)
                  } catch (err) {
                    console.error(err)
                    notification.error({ message: 'เกิดข้อผิดพลาด', description: 'ไม่สามารถบันทึกคะแนนได้', placement: 'topRight' })
                  }
                }} className="flex-1 py-3 rounded-xl font-bold text-white bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-500/30 transition-all">
                  ✅ รับคะแนน
                </button>
              </div>
          </div>
        </div>
      )}
    </div>
  )
}
