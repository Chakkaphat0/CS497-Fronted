import { useState } from 'react'
import { App } from 'antd'
import { auth } from '../firebase'
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth'

export default function LoginPage({ onLogin }) {
  const { notification, message: messageApi } = App.useApp()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isRegistering, setIsRegistering] = useState(false)

  const handleAuth = async (e) => {
    e.preventDefault();
    if (email && password) {
      try {
        if (isRegistering) {
          await createUserWithEmailAndPassword(auth, email, password);
        } else {
          await signInWithEmailAndPassword(auth, email, password);
        }
        onLogin();
      } catch (err) {
        notification.error({
          message: isRegistering ? 'ลงทะเบียนไม่สำเร็จ' : 'เข้าสู่ระบบไม่สำเร็จ',
          description: err.message,
          placement: 'topRight',
        });
      }
    }
  }

  return (
    <section className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden bg-gray-50 dark:bg-gray-950 transition-colors duration-500">
      {/* Background decorations */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary-400/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-purple-400/20 rounded-full blur-3xl pointer-events-none"></div>

      <div className="glass-panel w-full max-w-md rounded-[2rem] p-10 relative z-10 animate-fade-in-up bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-200 dark:border-gray-800 shadow-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-primary-600 to-purple-600 text-white shadow-lg mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-purple-600 mb-2">
            AI Interview
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            {isRegistering ? 'Create a new account' : 'Sign in to start your practice'}
          </p>
        </div>

        {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-xl text-sm">{error}</div>}

        <form onSubmit={handleAuth} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email Address</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-5 py-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-5 py-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
              required
            />
          </div>

          <div className="space-y-3">
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 text-white py-4 rounded-xl font-semibold shadow-lg shadow-primary-500/30 transition-all hover-lift"
            >
              {isRegistering ? 'Register' : 'Sign In'}
            </button>

            <button
              type="button"
              onClick={async () => {
                const testEmail = 'test@example.com';
                const testPassword = 'password123';
                try {
                  await signInWithEmailAndPassword(auth, testEmail, testPassword);
                  onLogin();
                } catch (err) {
                  // If account doesn't exist, create it automatically
                  if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
                    try {
                      await createUserWithEmailAndPassword(auth, testEmail, testPassword);
                      onLogin();
                    } catch (registerErr) {
                      notification.error({ message: 'Error', description: registerErr.message });
                    }
                  } else {
                    notification.error({ message: 'Error', description: err.message });
                  }
                }
              }}
              className="w-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 py-3 rounded-xl font-medium transition-all hover-lift border border-gray-200 dark:border-gray-700"
            >
              🚀 Login with Test Account
            </button>
          </div>
        </form>

        <div className="mt-6 text-center">
          <button 
            onClick={() => { setIsRegistering(!isRegistering); }}
            className="text-primary-600 dark:text-primary-400 hover:underline text-sm font-medium"
          >
            {isRegistering ? 'Already have an account? Sign In' : 'Need an account? Register'}
          </button>
        </div>
      </div>
    </section>
  )
}
