import { useState, useEffect } from 'react'
import { db } from '../firebase'
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore'

export default function AdminDashboard({ onLogout, onChangeRole, isDark, toggleTheme }) {
  const [activeTab, setActiveTab] = useState('users')
  const [users, setUsers] = useState([])
  const [universities, setUniversities] = useState([])
  const [candidates, setCandidates] = useState([])
  const [newUniName, setNewUniName] = useState('')
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserRole, setNewUserRole] = useState('candidate')
  const [positions, setPositions] = useState([])
  const [newPosition, setNewPosition] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const [uSnap, uniSnap, cSnap, pSnap] = await Promise.all([
          getDocs(collection(db, 'userRoles')),
          getDocs(collection(db, 'universities')),
          getDocs(collection(db, 'candidates')),
          getDocs(collection(db, 'positions'))
        ])
        setUsers(uSnap.docs.map(d => ({ id: d.id, ...d.data() })))
        setUniversities(uniSnap.docs.map(d => ({ id: d.id, ...d.data() })))
        setCandidates(cSnap.docs.map(d => ({ id: d.id, ...d.data() })))
        setPositions(pSnap.docs.map(d => ({ id: d.id, ...d.data() })))
      } catch (e) { console.error(e) }
    }
    load()
  }, [])

  const addUniversity = async () => {
    if (!newUniName.trim()) return
    const ref = await addDoc(collection(db, 'universities'), { name: newUniName.trim(), departments: [], totalStudents: 0, avgOverallScore: 0 })
    setUniversities(prev => [...prev, { id: ref.id, name: newUniName.trim(), departments: [], totalStudents: 0 }])
    setNewUniName('')
  }

  const addUser = async () => {
    if (!newUserEmail.trim()) return
    const ref = await addDoc(collection(db, 'userRoles'), { email: newUserEmail.trim(), role: newUserRole, displayName: newUserEmail.split('@')[0] })
    setUsers(prev => [...prev, { id: ref.id, email: newUserEmail.trim(), role: newUserRole, displayName: newUserEmail.split('@')[0] }])
    setNewUserEmail('')
  }

  const deleteUser = async (id) => {
    await deleteDoc(doc(db, 'userRoles', id))
    setUsers(prev => prev.filter(u => u.id !== id))
  }

  const addPosition = async () => {
    if (!newPosition.trim()) return
    const ref = await addDoc(collection(db, 'positions'), { title: newPosition.trim() })
    setPositions(prev => [...prev, { id: ref.id, title: newPosition.trim() }])
    setNewPosition('')
  }
  
  const deletePosition = async (id) => {
    await deleteDoc(doc(db, 'positions', id))
    setPositions(prev => prev.filter(p => p.id !== id))
  }

  const tabs = [{ id: 'users', icon: '👥', label: 'Users' }, { id: 'universities', icon: '🏛️', label: 'Universities' }, { id: 'positions', icon: '💼', label: 'Positions' }, { id: 'candidates', icon: '🎓', label: 'Interviews' }, { id: 'platform', icon: '⚙️', label: 'Platform' }]

  return (
    <div className={`flex h-screen bg-gray-50 dark:bg-gray-950 font-sans ${isDark ? 'dark' : ''}`}>
      <aside className="w-[280px] bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 p-6 flex flex-col shadow-sm shrink-0 hidden lg:flex">
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-red-600 to-orange-500 flex items-center justify-center text-white shadow-md text-sm font-bold">🛡️</div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">AI Interview</h1>
        </div>
        <nav className="space-y-2">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-medium transition-all ${activeTab === tab.id ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}>
              <span className="text-xl">{tab.icon}</span> {tab.label}
            </button>
          ))}
        </nav>
        <div className="mt-auto space-y-2">
          <button onClick={onChangeRole} className="w-full flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 py-3 rounded-xl font-medium transition-all text-sm">🔄 Switch Role</button>
          <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 py-3 rounded-xl font-medium transition-all">Sign Out</button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-20 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-8 shrink-0">
          <div><h1 className="text-2xl font-bold text-gray-900 dark:text-white">Super Admin</h1><p className="text-sm text-gray-500">Platform Management</p></div>
          <button onClick={toggleTheme} className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">{isDark ? '☀️' : '🌙'}</button>
        </header>

        <div className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[{ icon: '👥', label: 'Users', value: users.length }, { icon: '🏛️', label: 'Universities', value: universities.length }, { icon: '🎓', label: 'Interviews', value: candidates.length }, { icon: '📊', label: 'Avg Score', value: candidates.length > 0 ? (candidates.reduce((a, c) => a + (c.scores?.overall || 0), 0) / candidates.length).toFixed(1) : '—' }].map((s, i) => (
              <div key={i} className="bg-white dark:bg-gray-800/80 rounded-2xl p-5 border border-gray-100 dark:border-gray-700/50">
                <div className="flex items-center gap-2 mb-1"><span>{s.icon}</span><span className="text-xs font-bold text-gray-400 uppercase">{s.label}</span></div>
                <p className="text-3xl font-extrabold text-gray-900 dark:text-white">{s.value}</p>
              </div>
            ))}
          </div>

          {/* Users Tab */}
          {activeTab === 'users' && (
            <div className="bg-white dark:bg-gray-800/80 rounded-2xl p-6 border border-gray-100 dark:border-gray-700/50">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">User Management</h3>
              <div className="flex gap-3 mb-6">
                <input value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} placeholder="Email..." className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white outline-none" />
                <select value={newUserRole} onChange={e => setNewUserRole(e.target.value)} className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white outline-none">
                  <option value="candidate">Interview</option><option value="employer">Employer</option><option value="university">University</option><option value="admin">Admin</option>
                </select>
                <button onClick={addUser} className="px-6 py-2.5 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition">+ Add</button>
              </div>
              <div className="space-y-2">
                {users.map(u => (
                  <div key={u.id} className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                    <div><p className="font-semibold text-gray-900 dark:text-white">{u.displayName || u.email}</p><p className="text-xs text-gray-500">{u.email} · <span className={`font-bold capitalize ${u.role === 'admin' ? 'text-red-500' : u.role === 'university' ? 'text-emerald-500' : u.role === 'employer' ? 'text-purple-500' : 'text-blue-500'}`}>{u.role}</span></p></div>
                    <button onClick={() => deleteUser(u.id)} className="px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition">Delete</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Universities Tab */}
          {activeTab === 'universities' && (
            <div className="bg-white dark:bg-gray-800/80 rounded-2xl p-6 border border-gray-100 dark:border-gray-700/50">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">University Management</h3>
              <div className="flex gap-3 mb-6">
                <input value={newUniName} onChange={e => setNewUniName(e.target.value)} placeholder="University name..." className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white outline-none" />
                <button onClick={addUniversity} className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition">+ Add</button>
              </div>
              <div className="space-y-2">
                {universities.map(u => (
                  <div key={u.id} className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                    <div><p className="font-semibold text-gray-900 dark:text-white">{u.name}</p><p className="text-xs text-gray-500">ID: {u.id} · {u.totalStudents || 0} students</p></div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Interviews Tab */}
          {activeTab === 'candidates' && (
            <div className="bg-white dark:bg-gray-800/80 rounded-2xl p-6 border border-gray-100 dark:border-gray-700/50">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">All Interviews (Firebase)</h3>
              <div className="overflow-x-auto"><table className="w-full text-left"><thead><tr className="border-b border-gray-100 dark:border-gray-700"><th className="pb-3 text-xs font-bold text-gray-400 uppercase">Name</th><th className="pb-3 text-xs font-bold text-gray-400 uppercase">Title</th><th className="pb-3 text-xs font-bold text-gray-400 uppercase">University</th><th className="pb-3 text-xs font-bold text-gray-400 uppercase text-center">Score</th><th className="pb-3 text-xs font-bold text-gray-400 uppercase">Tier</th></tr></thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {candidates.map(c => (<tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50"><td className="py-3 font-medium text-gray-900 dark:text-white text-sm">{c.name}</td><td className="py-3 text-sm text-gray-600 dark:text-gray-400">{c.title}</td><td className="py-3 text-sm text-gray-600 dark:text-gray-400">{c.university}</td><td className="py-3 text-center font-bold text-emerald-600">{(c.scores?.overall || 0).toFixed(1)}</td><td className="py-3"><span className={`px-2 py-0.5 rounded text-xs font-bold ${c.tier === 'premium' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>{c.tier}</span></td></tr>))}
              </tbody></table></div>
            </div>
          )}

          {/* Positions Tab */}
          {activeTab === 'positions' && (
            <div className="bg-white dark:bg-gray-800/80 rounded-2xl p-6 border border-gray-100 dark:border-gray-700/50">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Position / Title Management</h3>
              <div className="flex gap-3 mb-6">
                <input value={newPosition} onChange={e => setNewPosition(e.target.value)} placeholder="E.g., Senior Frontend Engineer" className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white outline-none" />
                <button onClick={addPosition} className="px-6 py-2.5 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition">+ Add Position</button>
              </div>
              <div className="space-y-2">
                {positions.map(p => (
                  <div key={p.id} className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                    <div><p className="font-semibold text-gray-900 dark:text-white">{p.title}</p></div>
                    <button onClick={() => deletePosition(p.id)} className="px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition">Delete</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Platform Tab */}
          {activeTab === 'platform' && (
            <div className="bg-white dark:bg-gray-800/80 rounded-2xl p-6 border border-gray-100 dark:border-gray-700/50">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-5">Platform Settings</h3>
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"><h4 className="font-semibold text-gray-900 dark:text-white mb-1">Firebase Project</h4><p className="text-sm text-gray-500">cs497-e3b0e · Firestore (default)</p></div>
                <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"><h4 className="font-semibold text-gray-900 dark:text-white mb-1">Collections</h4><p className="text-sm text-gray-500">candidates · universities · userRoles · chatHistory · employerMessages</p></div>
                <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"><h4 className="font-semibold text-gray-900 dark:text-white mb-1">Version</h4><p className="text-sm text-gray-500">AI Interview v2.0 — Talent Marketplace</p></div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
