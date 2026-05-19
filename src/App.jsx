import { useState, useEffect } from 'react'
import { App as AntApp } from 'antd'
import LoginPage from './pages/LoginPage'
import RoleSelectPage from './pages/RoleSelectPage'
import HomePage from './pages/HomePage'
import ChatPage from './pages/ChatPage'
import VoicePage from './pages/VoicePage'
import ProfilePage from './pages/ProfilePage'
import HistoryPage from './pages/HistoryPage'
import CandidateDashboard from './pages/CandidateDashboard'
import EmployerHub from './pages/EmployerHub'
import UniversityDashboard from './pages/UniversityDashboard'
import AdminDashboard from './pages/AdminDashboard'
import './index.css'

function App() {
  const [currentPage, setCurrentPage] = useState('login')
  const [userRole, setUserRole] = useState(null) // 'candidate', 'employer', 'university', 'admin'
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [isDark])

  // ─── Navigation Handlers ─────────────────────────────────────
  const handleLogin = () => setCurrentPage('roleSelect')

  const handleSelectRole = (role) => {
    setUserRole(role)
    if (role === 'candidate') setCurrentPage('candidateDashboard')
    else if (role === 'employer') setCurrentPage('employerHub')
    else if (role === 'university') setCurrentPage('universityDashboard')
    else if (role === 'admin') setCurrentPage('adminDashboard')
  }

  const handleChangeRole = () => setCurrentPage('roleSelect')
  const handleGoHome = () => setCurrentPage('home')
  const handleGoChat = () => setCurrentPage('chat')
  const handleGoVoice = () => setCurrentPage('voice')
  const handleGoHistory = () => setCurrentPage('history')
  const handleGoProfile = () => setCurrentPage('profile')

  // Go back to the user's dashboard based on their role
  const handleGoDashboard = () => {
    if (userRole === 'candidate') setCurrentPage('candidateDashboard')
    else if (userRole === 'employer') setCurrentPage('employerHub')
    else if (userRole === 'university') setCurrentPage('universityDashboard')
    else if (userRole === 'admin') setCurrentPage('adminDashboard')
    else setCurrentPage('home')
  }

  const handleLogout = () => {
    setUserRole(null)
    setCurrentPage('login')
  }

  const toggleTheme = () => setIsDark(!isDark)

  return (
    <div className={`transition-all duration-300 ${isDark ? 'dark' : ''}`}>
      {currentPage === 'login' && <LoginPage onLogin={handleLogin} />}
      {currentPage === 'roleSelect' && <RoleSelectPage onSelectRole={handleSelectRole} />}
      {currentPage === 'home' && <HomePage onGoChat={handleGoChat} onGoVoice={handleGoVoice} onGoProfile={handleGoProfile} />}
      {currentPage === 'profile' && <ProfilePage onBack={handleGoDashboard} onLogout={handleLogout} />}

      {/* Candidate Dashboard */}
      {currentPage === 'candidateDashboard' && (
        <CandidateDashboard
          onGoChat={handleGoChat}
          onGoVoice={handleGoVoice}
          onGoHistory={handleGoHistory}
          onGoProfile={handleGoProfile}
          onLogout={handleLogout}
          onChangeRole={handleChangeRole}
          isDark={isDark}
          toggleTheme={toggleTheme}
        />
      )}

      {/* Employer Hub */}
      {currentPage === 'employerHub' && (
        <EmployerHub
          onLogout={handleLogout}
          onChangeRole={handleChangeRole}
          isDark={isDark}
          toggleTheme={toggleTheme}
        />
      )}

      {/* University Dashboard */}
      {currentPage === 'universityDashboard' && (
        <UniversityDashboard
          onLogout={handleLogout}
          onChangeRole={handleChangeRole}
          isDark={isDark}
          toggleTheme={toggleTheme}
        />
      )}

      {/* Admin Dashboard */}
      {currentPage === 'adminDashboard' && (
        <AdminDashboard
          onLogout={handleLogout}
          onChangeRole={handleChangeRole}
          isDark={isDark}
          toggleTheme={toggleTheme}
        />
      )}

      {/* Shared Pages — Chat, Voice, History */}
      {currentPage === 'chat' && (
        <ChatPage
          onGoHome={handleGoDashboard}
          onGoVoice={handleGoVoice}
          onGoHistory={handleGoHistory}
          onLogout={handleLogout}
          isDark={isDark}
          toggleTheme={toggleTheme}
        />
      )}
      {currentPage === 'voice' && (
        <VoicePage
          onGoHome={handleGoDashboard}
          onGoChat={handleGoChat}
          onGoHistory={handleGoHistory}
          onLogout={handleLogout}
          isDark={isDark}
          toggleTheme={toggleTheme}
        />
      )}
      {currentPage === 'history' && (
        <HistoryPage
          onGoDashboard={handleGoDashboard}
          onGoChat={handleGoChat}
          onGoVoice={handleGoVoice}
          onGoHistory={handleGoHistory}
          onLogout={handleLogout}
          isDark={isDark}
          toggleTheme={toggleTheme}
        />
      )}
    </div>
  )
}

export default App
