import { useState, useRef, useEffect } from 'react'
import { App } from 'antd'
import Sidebar from '../components/Sidebar'

export default function VoicePage({ onGoChat, onGoHistory, onLogout, isDark, toggleTheme }) {
  const { notification, modal } = App.useApp()
  const [mode, setMode] = useState('normal')
  const [isRecording, setIsRecording] = useState(false)
  const [micStatus, setMicStatus] = useState('idle') // 'idle', 'error', 'listening'
  
  // Device Selection States
  const [devices, setDevices] = useState([])
  const [selectedDeviceId, setSelectedDeviceId] = useState('')
  const [isTestingMic, setIsTestingMic] = useState(false)
  
  const streamRef = useRef(null)
  const audioContextRef = useRef(null)
  const analyserRef = useRef(null)
  const animationFrameRef = useRef(null)
  const visualizerRef = useRef(null)
  const testVisualizerRef = useRef(null)

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
    stopAudioTracks()
    if (visualizerRef.current) {
      visualizerRef.current.style.transform = 'scale(1)'
      visualizerRef.current.style.boxShadow = 'none'
    }
    setIsRecording(false)
    setMicStatus('idle')
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
    setIsRecording(true)
    setMicStatus('listening')
    const success = await setupAudioVisualization(visualizerRef, 'interview')
    if (!success) {
      setIsRecording(false)
      setMicStatus('error')
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
          <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white dark:bg-gray-950 relative">
            
            <div className="text-center max-w-2xl w-full z-10 animate-fade-in-up">
              <div className="mb-12 relative inline-block">
                {isRecording && (
                  <>
                    <div className="absolute inset-0 bg-purple-500 rounded-full animate-ping opacity-20"></div>
                    <div className="absolute -inset-4 bg-purple-400 rounded-full animate-pulse opacity-10"></div>
                  </>
                )}
                
                {/* Visualizer Target */}
                <div 
                  ref={visualizerRef}
                  className={`w-40 h-40 rounded-full flex items-center justify-center text-6xl shadow-2xl relative z-10 transition-colors duration-300 ${
                    isRecording 
                      ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white' 
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                  }`}
                  style={{ transition: 'transform 0.1s ease-out, background 0.3s' }}
                >
                  🎙️
                </div>
              </div>

              <h2 className="text-4xl font-extrabold text-gray-900 dark:text-white mb-4">
                {isRecording ? 'Listening...' : 'Ready to speak'}
              </h2>
              
              <p className="text-xl text-gray-500 dark:text-gray-400 mb-12 h-14">
                {isRecording 
                  ? 'Speak your answer clearly. The UI will react to your voice.' 
                  : 'Select your microphone on the right, test it, then start.'}
              </p>

              <button 
                onClick={toggleRecording}
                className={`px-10 py-5 rounded-full text-xl font-bold shadow-xl transition-all hover-lift flex items-center gap-3 mx-auto ${
                  isRecording
                    ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/30'
                    : 'bg-purple-600 hover:bg-purple-700 text-white shadow-purple-500/30'
                }`}
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
    </div>
  )
}
