const fs = require('fs');

let content = fs.readFileSync('src/pages/VoicePage.jsx', 'utf8');

// 1. Add imports
content = content.replace(
  "import { connectSSE, disconnectSSE } from '../services/sseService'",
  "import { connectSSE, disconnectSSE } from '../services/sseService'\nimport { auth, db } from '../firebase'\nimport { collection, addDoc, serverTimestamp } from 'firebase/firestore'"
);

// 2. Add states
content = content.replace(
  "const [micStatus, setMicStatus] = useState('idle') // 'idle', 'error', 'listening'",
  `const [micStatus, setMicStatus] = useState('idle') // 'idle', 'error', 'listening'
  
  // New Chat States
  const [messages, setMessages] = useState([])
  const [isStarted, setIsStarted] = useState(false)
  const [isEnded, setIsEnded] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const chatEndRef = useRef(null)

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, aiSubtitle, subtitle, isRecording])`
);

// 3. Update SSE Callback
content = content.replace(
  `        } else if (data.type === 'ai' && data.text) {
          const cleanText = data.text.trim()
          if (cleanText !== '' && cleanText !== 'No response text') {
            setAiSubtitle(cleanText)
            generateVoice(cleanText)
          }
        }`,
  `        } else if (data.type === 'ai' && data.text) {
          const cleanText = data.text.trim()
          if (cleanText !== '' && cleanText !== 'No response text') {
            setAiSubtitle(cleanText)
            setMessages(prev => [...prev, { type: 'ai', text: cleanText }])
            generateVoice(cleanText)
          }
        }`
);

// 4. Add Save History Effect right before // Initialize Speech Recognition
content = content.replace(
  "// Initialize Speech Recognition",
  `// Save history
  useEffect(() => {
    if (isEnded && !isSaving && messages.length > 0) {
      setIsSaving(true);
      if (auth.currentUser) {
        addDoc(collection(db, 'chatHistory'), {
          userId: auth.currentUser.uid,
          messages: messages,
          timestamp: serverTimestamp(),
          mode: mode + '-voice'
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
  }, [isEnded, isSaving, messages, mode])

  // Initialize Speech Recognition`
);

// 5. Update stopInterviewMic
content = content.replace(
  `    if (subtitle.trim()) {
      handleSendToAI(subtitle);
    }`,
  `    if (subtitle.trim()) {
      const userText = subtitle.trim();
      setMessages(prev => [...prev, { type: 'user', text: userText }]);
      handleSendToAI(userText);
    }`
);

// 6. Update startInterviewMic
content = content.replace(
  `  const startInterviewMic = async () => {
    setIsRecording(true)`,
  `  const startInterviewMic = async () => {
    if (!isStarted) setIsStarted(true);
    setIsRecording(true)`
);

// 7. Update UI
const oldUIStart = `<div className="flex-1 flex overflow-hidden">
          {/* Main Voice Area */}
          <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white dark:bg-gray-950 relative">`;
const oldUIEnd = `</div>
          </div>

          {/* Right Sidebar - Mode Settings */}`;

const newUI = `<div className="flex-1 flex overflow-hidden">
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
                    <div key={idx} className={\`flex \${msg.type === 'ai' ? 'justify-start' : 'justify-end'}\`}>
                      <div className={\`max-w-[80%] lg:max-w-[70%] rounded-2xl px-6 py-4 shadow-sm \${
                        msg.type === 'ai'
                          ? 'bg-gray-100 dark:bg-gray-800/80 text-gray-800 dark:text-gray-100 rounded-tl-none'
                          : 'bg-purple-600 text-white rounded-tr-none'
                      }\`}>
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
                      className={\`w-16 h-16 rounded-full flex items-center justify-center text-2xl shadow-lg relative z-10 transition-colors duration-300 \${
                        isRecording 
                          ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white' 
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                      }\`}
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
                  className={\`px-10 py-4 rounded-full text-lg font-bold shadow-xl transition-all hover-lift flex items-center gap-3 \${
                    isRecording
                      ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/30'
                      : 'bg-purple-600 hover:bg-purple-700 text-white shadow-purple-500/30'
                  } disabled:opacity-50 disabled:cursor-not-allowed\`}
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

          {/* Right Sidebar - Mode Settings */}`;

const startIdx = content.indexOf(oldUIStart);
const endIdx = content.indexOf(oldUIEnd);

if (startIdx !== -1 && endIdx !== -1) {
  content = content.substring(0, startIdx) + newUI + content.substring(endIdx + oldUIEnd.length);
} else {
  console.log('UI block not found');
}

fs.writeFileSync('src/pages/VoicePage.jsx', content);
console.log('VoicePage.jsx patched');
