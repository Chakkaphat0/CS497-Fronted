import { useState } from 'react'
import { App } from 'antd'
import { auth, db } from '../firebase'
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'

export default function LoginPage({ onLogin }) {
  const { notification } = App.useApp()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isRegistering, setIsRegistering] = useState(false)
  const [fullName, setFullName] = useState('')
  const [accountType, setAccountType] = useState('candidate') // 'candidate', 'enterprise', 'university'
  const [companyName, setCompanyName] = useState('')
  const [universityName, setUniversityName] = useState('')

  const handleAuth = async (e) => {
    e.preventDefault();
    if (email && password) {
      try {
        if (isRegistering) {
          const cred = await createUserWithEmailAndPassword(auth, email, password);
          // Update display name
          if (fullName.trim()) {
            await updateProfile(cred.user, { displayName: fullName.trim() })
          }
          // Save account type info to Firestore
          await addDoc(collection(db, 'userRoles'), {
            uid: cred.user.uid,
            email,
            displayName: fullName.trim() || email.split('@')[0],
            role: accountType,
            companyName: accountType === 'enterprise' ? companyName.trim() : '',
            universityName: accountType === 'university' ? universityName.trim() : '',
            timestamp: serverTimestamp()
          })
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

  const inputClass = "w-full px-5 py-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-sm"

  return (
    <section className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden bg-gray-50 dark:bg-gray-950 transition-colors duration-500">
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

        <form onSubmit={handleAuth} className="space-y-4">
          {/* Account Type Selector (Register only) */}
          {isRegistering && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Account Type</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'candidate', icon: '🎓', label: 'Candidate' },
                  { id: 'enterprise', icon: '🏢', label: 'Enterprise' },
                  { id: 'university', icon: '🏛️', label: 'University' },
                ].map(t => (
                  <button key={t.id} type="button" onClick={() => setAccountType(t.id)}
                    className={`flex flex-col items-center p-3 rounded-xl border-2 transition-all text-sm font-medium ${accountType === t.id ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-600' : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-300'}`}>
                    <span className="text-lg mb-1">{t.icon}</span>{t.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Full Name (Register only) */}
          {isRegistering && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Full Name</label>
              <input type="text" placeholder="Your full name" value={fullName} onChange={e => setFullName(e.target.value)} className={inputClass} required />
            </div>
          )}

          {/* Company Name (Enterprise only) */}
          {isRegistering && accountType === 'enterprise' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Company Name</label>
              <input type="text" placeholder="e.g. TechCorp Co., Ltd." value={companyName} onChange={e => setCompanyName(e.target.value)} className={inputClass} required />
            </div>
          )}

          {/* University Name (University only) */}
          {isRegistering && accountType === 'university' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">University Name</label>
              <input type="text" placeholder="e.g. Chulalongkorn University" value={universityName} onChange={e => setUniversityName(e.target.value)} className={inputClass} required />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email Address</label>
            <input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} className={inputClass} required />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Password</label>
            <input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} className={inputClass} required />
          </div>

          <div className="space-y-3 pt-2">
            <button type="submit" className="w-full bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 text-white py-4 rounded-xl font-semibold shadow-lg shadow-primary-500/30 transition-all hover-lift">
              {isRegistering ? 'Register' : 'Sign In'}
            </button>

            <button type="button" onClick={async () => {
              const testEmail = 'test@example.com'; const testPassword = 'password123';
              try {
                await signInWithEmailAndPassword(auth, testEmail, testPassword); onLogin();
              } catch (err) {
                if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
                  try { await createUserWithEmailAndPassword(auth, testEmail, testPassword); onLogin(); }
                  catch (e2) { notification.error({ message: 'Error', description: e2.message }) }
                } else { notification.error({ message: 'Error', description: err.message }) }
              }
            }} className="w-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 py-3 rounded-xl font-medium transition-all hover-lift border border-gray-200 dark:border-gray-700">
              🚀 Login with Test Account
            </button>
          </div>
        </form>

        <div className="mt-6 text-center">
          <button onClick={() => { setIsRegistering(!isRegistering); }} className="text-primary-600 dark:text-primary-400 hover:underline text-sm font-medium">
            {isRegistering ? 'Already have an account? Sign In' : 'Need an account? Register'}
          </button>
        </div>
      </div>
    </section>
  )
}
