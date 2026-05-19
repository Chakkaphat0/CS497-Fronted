export default function Sidebar({ activeTab, onGoDashboard, onGoChat, onGoVoice, onGoHistory, onLogout }) {
  return (
    <aside className="w-[280px] bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 p-6 flex flex-col transition-colors duration-300 z-20 shadow-sm">
      <div className="flex items-center gap-3 mb-10 px-2">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary-600 to-purple-600 flex items-center justify-center text-white shadow-md">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
          AI Interview
        </h1>
      </div>

      <nav className="space-y-2">
        {onGoDashboard && (
          <button
            onClick={onGoDashboard}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-white transition-all"
          >
            <span className="text-xl">🏠</span>
            Dashboard
          </button>
        )}
        <button
          onClick={onGoChat}
          className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-medium transition-all ${
            activeTab === 'chat'
              ? 'bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <span className="text-xl">💬</span>
          Chat Interview
        </button>

        <button
          onClick={onGoVoice}
          className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-medium transition-all ${
            activeTab === 'voice'
              ? 'bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <span className="text-xl">🎙️</span>
          Voice Interview
        </button>

        <button
          onClick={onGoHistory}
          className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-medium transition-all ${
            activeTab === 'history'
              ? 'bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <span className="text-xl">📜</span>
          History
        </button>
      </nav>

      <button
        onClick={onLogout}
        className="mt-auto w-full flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 py-3.5 rounded-xl font-medium transition-all"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
        </svg>
        Sign Out
      </button>
    </aside>
  )
}
