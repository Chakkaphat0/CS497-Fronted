import { useState, useEffect } from 'react'
import { App } from 'antd'
import Sidebar from '../components/Sidebar'
import { auth, db } from '../firebase'
import { collection, query, where, orderBy, getDocs, doc, deleteDoc } from 'firebase/firestore'

export default function HistoryPage({ onGoDashboard, onGoChat, onGoVoice, onGoHistory, onLogout, isDark, toggleTheme }) {
  const { modal, notification } = App.useApp()
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedChat, setSelectedChat] = useState(null)

  useEffect(() => {
    const fetchHistory = async () => {
      if (!auth.currentUser) return;
      try {
        const q = query(
          collection(db, 'chatHistory'),
          where('userId', '==', auth.currentUser.uid)
        );
        const querySnapshot = await getDocs(q);
        const historyData = [];
        querySnapshot.forEach((doc) => {
          historyData.push({ id: doc.id, ...doc.data() });
        });
        
        // Sort by timestamp descending in JS to avoid requiring a Firestore Composite Index
        historyData.sort((a, b) => {
          const timeA = a.timestamp ? a.timestamp.toMillis() : 0;
          const timeB = b.timestamp ? b.timestamp.toMillis() : 0;
          return timeB - timeA;
        });
        
        setHistory(historyData);
      } catch (error) {
        console.error("Error fetching history: ", error);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [])

  const handleDelete = async (id, e) => {
    if (e) e.stopPropagation();
    
    modal.confirm({
      title: 'คุณแน่ใจหรือไม่ว่าต้องการลบประวัตินี้?',
      content: 'ข้อมูลที่ลบไปแล้วจะไม่สามารถกู้คืนกลับมาได้',
      okText: 'ลบข้อมูล',
      okType: 'danger',
      cancelText: 'ยกเลิก',
      onOk: async () => {
        try {
          await deleteDoc(doc(db, 'chatHistory', id));
          setHistory(prev => prev.filter(item => item.id !== id));
          if (selectedChat?.id === id) {
            setSelectedChat(null);
          }
          notification.success({
            message: 'ลบข้อมูลเรียบร้อยแล้ว',
            placement: 'topRight',
          });
        } catch (error) {
          console.error("Error deleting history:", error);
          notification.error({
            message: 'เกิดข้อผิดพลาด',
            description: 'ไม่สามารถลบข้อมูลได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง',
            placement: 'topRight',
          });
        }
      },
    });
  };

  return (
    <div className={`flex h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-300 font-sans ${isDark ? 'dark' : ''}`}>
      <Sidebar 
        activeTab="history" 
        onGoDashboard={onGoDashboard}
        onGoChat={onGoChat}
        onGoVoice={onGoVoice}
        onGoHistory={onGoHistory}
        onLogout={onLogout}
      />

      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Top Header */}
        <header className="h-20 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-8 z-10 sticky top-0 shrink-0">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Interview History</h1>
          
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
              <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 border-2 border-primary-500 flex items-center justify-center font-bold text-gray-500">
                {auth.currentUser?.photoURL ? (
                  <img src={auth.currentUser.photoURL} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  auth.currentUser?.email?.charAt(0).toUpperCase() || 'U'
                )}
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-4xl mx-auto">
            {loading ? (
              <div className="text-center py-12 text-gray-500">
                <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4"></div>
                Loading your interview history...
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-16 px-6 bg-white dark:bg-gray-900 rounded-[2rem] border border-dashed border-gray-300 dark:border-gray-700">
                <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">
                  📭
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No history yet</h3>
                <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                  You haven't completed any interviews. Go to Chat or Voice interview to start practicing!
                </p>
                <button 
                  onClick={onGoChat}
                  className="mt-8 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium transition-colors"
                >
                  Start an Interview
                </button>
              </div>
            ) : (
              <div className="grid gap-4">
                {history.map((chat) => (
                  <div 
                    key={chat.id} 
                    onClick={() => setSelectedChat(chat)}
                    className="p-6 rounded-2xl border border-gray-200 dark:border-gray-800 hover:border-primary-500 dark:hover:border-primary-500 hover:shadow-lg transition-all cursor-pointer bg-white dark:bg-gray-900 group flex justify-between items-center"
                  >
                    <div>
                      <div className="flex items-center gap-3 mb-3">
                        <span className={`px-3 py-1 text-xs font-bold rounded-lg ${
                          chat.mode?.includes('virtual') 
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' 
                            : 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                        }`}>
                          {chat.mode === 'virtual' ? 'Virtual Mode' : 
                           chat.mode === 'normal' ? 'Normal Mode' : 
                           chat.mode === 'virtual-voice' ? 'Virtual Voice Mode' : 
                           chat.mode === 'normal-voice' ? 'Normal Voice Mode' : 'Normal Mode'}
                        </span>
                        {chat.overallScore !== undefined && chat.overallScore !== null && (
                          <span className="px-3 py-1 text-xs font-bold rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                            Score: {chat.overallScore.toFixed(1)}
                          </span>
                        )}
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          {chat.timestamp ? new Date(chat.timestamp.toDate()).toLocaleString() : 'Just now'}
                        </span>
                      </div>
                      <p className="text-gray-700 dark:text-gray-300 text-base line-clamp-1">
                        {chat.messages && chat.messages.length > 2 
                          ? chat.messages[2]?.text 
                          : "No conversation data"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={(e) => handleDelete(chat.id, e)}
                        className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-500 hover:bg-red-100 dark:hover:bg-red-900/40 opacity-0 group-hover:opacity-100 transition-all z-10"
                        title="Delete History"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                      <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-primary-500 opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* History Modal */}
      {selectedChat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-gray-900 w-full max-w-3xl max-h-[85vh] rounded-3xl shadow-2xl flex flex-col border border-gray-200 dark:border-gray-800">
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center shrink-0">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Interview Record</h3>
                  {selectedChat.overallScore !== undefined && selectedChat.overallScore !== null && (
                    <span className="px-3 py-1 text-sm font-bold rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                      Score: {selectedChat.overallScore.toFixed(1)}/10.0
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {selectedChat.timestamp ? new Date(selectedChat.timestamp.toDate()).toLocaleString() : 'Unknown Time'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={(e) => handleDelete(selectedChat.id, e)}
                  className="w-10 h-10 rounded-full bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 flex items-center justify-center text-red-500 transition-colors"
                  title="Delete History"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
                <button 
                  onClick={() => setSelectedChat(null)}
                  className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50 dark:bg-gray-950/50">
              {selectedChat.messages?.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.type === 'ai' ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-5 py-4 ${
                    msg.type === 'ai'
                      ? 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-gray-700 rounded-tl-none shadow-sm'
                      : 'bg-primary-600 text-white rounded-tr-none shadow-md'
                  }`}>
                    {msg.type === 'ai' && <div className="text-xs font-bold text-primary-500 mb-1">AI Interviewer</div>}
                    {msg.type === 'user' && <div className="text-xs font-bold text-primary-200 mb-1">You</div>}
                    <p className="text-base whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
