import { useState, useEffect } from 'react'
import { auth, db } from '../firebase'
import { collection, query, where, getDocs, onSnapshot, orderBy, addDoc, serverTimestamp } from 'firebase/firestore'

function ScoreBadge({ label, score, icon, delay = 0 }) {
  const [anim, setAnim] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => {
      let s = 0; const step = score / 30
      const iv = setInterval(() => { s += step; if (s >= score) { setAnim(score); clearInterval(iv) } else setAnim(Math.round(s * 10) / 10) }, 30)
      return () => clearInterval(iv)
    }, delay)
    return () => clearTimeout(t)
  }, [score, delay])
  const col = score >= 9 ? 'emerald' : score >= 8 ? 'blue' : 'amber'
  return (
    <div className="bg-white dark:bg-gray-800/80 rounded-2xl p-5 border border-gray-100 dark:border-gray-700/50 hover:shadow-lg hover:-translate-y-0.5 transition-all">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2"><span className="text-lg">{icon}</span><span className="text-sm font-semibold text-gray-600 dark:text-gray-400">{label}</span></div>
        <span className={`text-2xl font-extrabold text-${col}-500 tabular-nums`}>{anim.toFixed(1)}</span>
      </div>
      <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full bg-gradient-to-r from-${col}-400 to-${col}-600 transition-all duration-1000`} style={{ width: `${(anim / 10) * 100}%`, transitionDelay: `${delay}ms` }} />
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, sub, gradient }) {
  return (
    <div className="relative overflow-hidden bg-white dark:bg-gray-800/80 rounded-2xl p-6 border border-gray-100 dark:border-gray-700/50 hover:shadow-lg transition-all group">
      <div className={`absolute -top-4 -right-4 w-20 h-20 rounded-full bg-gradient-to-br ${gradient} opacity-10 group-hover:opacity-20 transition-opacity`} />
      <div className="flex items-center gap-3 mb-2"><span className="text-2xl">{icon}</span><span className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</span></div>
      <p className="text-3xl font-extrabold text-gray-900 dark:text-white">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

export default function CandidateDashboard({ onGoChat, onGoVoice, onGoHistory, onGoProfile, onLogout, onChangeRole, isDark, toggleTheme }) {
  const user = auth.currentUser
  const [interviewCount, setInterviewCount] = useState(0)
  const [showPricing, setShowPricing] = useState(false)
  const [editProfile, setEditProfile] = useState(false)
  const [profileData, setProfileData] = useState({ education: 'B.Eng. Computer Engineering', university: 'Chulalongkorn University · 2025', experience: '1 Year Internship', company: 'Frontend Developer @ TechCorp', skills: ['React','Node.js','Python','AWS','TypeScript','Docker'] })
  const [editForm, setEditForm] = useState({ ...profileData })
  const [newSkill, setNewSkill] = useState('')

  const [scores, setScores] = useState({ technical: 0, communication: 0, problemSolving: 0, leadership: 0, creativity: 0 })
  const [overallScore, setOverallScore] = useState(0)
  const [scoreHistory, setScoreHistory] = useState([])
  const [activeTab, setActiveTab] = useState(() => sessionStorage.getItem('candidateTab') || 'dashboard')
  const [messages, setMessages] = useState([])
  const [msgInput, setMsgInput] = useState('')
  const [msgTarget, setMsgTarget] = useState(() => {
    const saved = sessionStorage.getItem('candidateMsgTarget')
    return saved ? JSON.parse(saved) : null
  })

  useEffect(() => {
    sessionStorage.setItem('candidateTab', activeTab)
  }, [activeTab])

  useEffect(() => {
    if (msgTarget) sessionStorage.setItem('candidateMsgTarget', JSON.stringify(msgTarget))
    else sessionStorage.removeItem('candidateMsgTarget')
  }, [msgTarget])

  useEffect(() => {
    if (!user) return
    // Fetch interview count
    getDocs(query(collection(db, 'chatHistory'), where('userId', '==', user.uid))).then(snap => setInterviewCount(snap.size)).catch(console.error)
    
    // Fetch real scores from interviewScores collection
    getDocs(query(collection(db, 'interviewScores'), where('userId', '==', user.uid))).then(snap => {
      const allScores = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      setScoreHistory(allScores)
      if (allScores.length > 0) {
        // Get latest score
        const sorted = allScores.sort((a, b) => (b.timestamp?.toMillis?.() || 0) - (a.timestamp?.toMillis?.() || 0))
        const latest = sorted[0]
        if (latest.scores) {
          setScores({
            technical: latest.scores['Technical'] || latest.scores.technical || 0,
            communication: latest.scores['Communication'] || latest.scores.communication || 0,
            problemSolving: latest.scores['Problem Solving'] || latest.scores.problemSolving || 0,
            leadership: latest.scores['Leadership'] || latest.scores.leadership || 0,
            creativity: latest.scores['Creativity'] || latest.scores.creativity || 0,
          })
          setOverallScore(latest.overall || 0)
        }
      }
    }).catch(console.error)
    
    // Fetch messages targeted at this user
    const qMsg = query(collection(db, 'employerMessages'), orderBy('timestamp', 'asc'))
    const unsubMsg = onSnapshot(qMsg, snap => {
      const allMsgs = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      const myMsgs = allMsgs.filter(m => 
        m.senderUid === user.uid || 
        m.targetUid === user.uid ||
        m.target === user.displayName || 
        m.target === user.email
      )
      setMessages(myMsgs)
    })
    
    return () => unsubMsg()
  }, [user])

  const sendMessage = async () => {
    if (!msgInput.trim() || !user || !msgTarget) return
    await addDoc(collection(db, 'employerMessages'), {
      senderUid: user.uid,
      senderName: user.displayName || user.email?.split('@')[0] || 'Interview',
      senderEmail: user.email || '',
      targetUid: msgTarget.uid || '',
      targetName: msgTarget.name || 'Unknown',
      target: msgTarget.name || 'Unknown',
      text: msgInput,
      timestamp: serverTimestamp()
    })
    setMsgInput('')
  }

  const saveProfile = () => { setProfileData({ ...editForm }); setEditProfile(false) }
  const addSkill = () => { if (newSkill.trim() && !editForm.skills.includes(newSkill.trim())) { setEditForm(p => ({ ...p, skills: [...p.skills, newSkill.trim()] })); setNewSkill('') } }
  const removeSkill = (s) => setEditForm(p => ({ ...p, skills: p.skills.filter(x => x !== s) }))

  const plans = [
    { name: 'Free', price: '฿0', period: '/forever', features: ['3 interviews/month', '2 Score Badges', 'Basic profile'], color: 'gray', current: true },
    { name: 'Standard', price: '฿299', period: '/month', features: ['20 interviews/month', 'All 5 Score Badges', 'Enhanced profile', 'Interview history export'], color: 'blue', popular: true },
    { name: 'Premium', price: '฿899', period: '/month', features: ['Unlimited interviews', 'All Badges + Score History', 'Full profile + Priority', 'See who viewed you', 'Video replay access'], color: 'purple' },
  ]

  return (
    <div className={`flex h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-300 font-sans ${isDark ? 'dark' : ''}`}>
      {/* Sidebar */}
      <aside className="w-[280px] bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 p-6 flex flex-col shadow-sm shrink-0 hidden lg:flex">
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white shadow-md text-sm font-bold">AI</div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">AI Interview</h1>
        </div>
        <nav className="space-y-2">
          <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-medium transition-all ${activeTab==='dashboard'?'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400':'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}><span className="text-xl">🏠</span> Dashboard</button>
          <button onClick={() => setActiveTab('messages')} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-medium transition-all ${activeTab==='messages'?'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400':'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}><span className="text-xl">📥</span> Messages</button>
          <button onClick={onGoChat} className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all"><span className="text-xl">💬</span> Chat Interview</button>
          <button onClick={onGoVoice} className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all"><span className="text-xl">🎙️</span> Voice Interview</button>
          <button onClick={onGoHistory} className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all"><span className="text-xl">📜</span> History</button>
        </nav>
        <div className="mt-auto space-y-2">
          <button onClick={onChangeRole} className="w-full flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 py-3 rounded-xl font-medium transition-all text-sm">🔄 Switch Role</button>
          <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 py-3 rounded-xl font-medium transition-all">Sign Out</button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-20 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-8 z-10 shrink-0">
          <div><h1 className="text-2xl font-bold text-gray-900 dark:text-white">{activeTab === 'dashboard' ? 'Interview Dashboard' : 'Messages'}</h1><p className="text-sm text-gray-500">Welcome, {user?.displayName || user?.email?.split('@')[0] || 'Interview'}</p></div>
          <div className="flex items-center gap-4">
            <button onClick={toggleTheme} className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition">{isDark ? '☀️' : '🌙'}</button>
            <button onClick={onGoProfile} className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white flex items-center justify-center font-bold shadow-md text-sm">{user?.displayName?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || 'I'}</button>
          </div>
        </header>

        {activeTab === 'dashboard' ? (
        <div className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-8">
          {/* Premium Banner */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 p-8 text-white shadow-xl">
            <div className="absolute inset-0 opacity-30" style={{backgroundImage:"url(\"data:image/svg+xml,%3Csvg width='40' height='40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 40L40 0' stroke='rgba(255,255,255,0.1)' fill='none'/%3E%3C/svg%3E\")"}} />
            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div><div className="flex items-center gap-2 mb-2"><span className="text-2xl">✨</span><span className="text-sm font-bold uppercase tracking-wider opacity-90">Upgrade Plan</span></div><h3 className="text-2xl font-extrabold mb-2">Unlock Your Full Potential</h3><p className="opacity-80 max-w-lg">Get more interview quotas, all score badges, and premium visibility to employers.</p></div>
              <button onClick={() => setShowPricing(true)} className="px-8 py-3.5 bg-white text-purple-700 rounded-xl font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all whitespace-nowrap">See Plans →</button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon="🏆" label="Overall Score" value={overallScore.toFixed(1)} sub="out of 10.0" gradient="from-amber-400 to-orange-500" />
            <StatCard icon="🎯" label="Interviews Done" value={interviewCount} sub="total sessions" gradient="from-blue-400 to-cyan-500" />
            <StatCard icon="📈" label="Rank Percentile" value="Top 15%" sub="among all interviews" gradient="from-purple-400 to-pink-500" />
            <StatCard icon="👀" label="Profile Views" value="—" sub="Upgrade to see" gradient="from-gray-300 to-gray-400" />
          </div>

          {/* Score Badges */}
          <div>
            <div className="flex items-center justify-between mb-5"><h2 className="text-xl font-bold text-gray-900 dark:text-white">AI Interview Score Badges</h2></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <ScoreBadge label="Technical" score={scores.technical} icon="💻" delay={0} />
              <ScoreBadge label="Communication" score={scores.communication} icon="🗣️" delay={100} />
              <ScoreBadge label="Problem Solving" score={scores.problemSolving} icon="🧩" delay={200} />
              <ScoreBadge label="Leadership" score={scores.leadership} icon="👔" delay={300} />
              <ScoreBadge label="Creativity" score={scores.creativity} icon="🎨" delay={400} />
              <div onClick={onGoChat} className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 rounded-2xl p-5 border-2 border-dashed border-blue-200 dark:border-blue-800/50 flex flex-col items-center justify-center text-center hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer group">
                <span className="text-3xl mb-2 group-hover:scale-110 transition-transform">🎯</span>
                <span className="text-sm font-bold text-blue-600 dark:text-blue-400">Take More Interviews</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button onClick={onGoChat} className="flex items-center gap-4 p-6 rounded-2xl bg-white dark:bg-gray-800/80 border border-gray-100 dark:border-gray-700/50 hover:shadow-lg hover:-translate-y-0.5 transition-all text-left group">
              <div className="w-14 h-14 rounded-xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">💬</div>
              <div><h3 className="font-bold text-gray-900 dark:text-white text-lg">Start Chat Interview</h3><p className="text-sm text-gray-500">Practice via text</p></div>
            </button>
            <button onClick={onGoVoice} className="flex items-center gap-4 p-6 rounded-2xl bg-white dark:bg-gray-800/80 border border-gray-100 dark:border-gray-700/50 hover:shadow-lg hover:-translate-y-0.5 transition-all text-left group">
              <div className="w-14 h-14 rounded-xl bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">🎙️</div>
              <div><h3 className="font-bold text-gray-900 dark:text-white text-lg">Start Voice Interview</h3><p className="text-sm text-gray-500">Real-time voice practice</p></div>
            </button>
          </div>

          {/* Profile Overview (Editable) */}
          <div className="bg-white dark:bg-gray-800/80 rounded-2xl p-6 border border-gray-100 dark:border-gray-700/50">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Profile Overview</h2>
              <button onClick={() => { setEditForm({ ...profileData }); setEditProfile(!editProfile) }} className="px-4 py-2 text-sm font-medium rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all">
                {editProfile ? '✕ Cancel' : '✏️ Edit'}
              </button>
            </div>
            {editProfile ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className="text-xs font-bold text-gray-400 uppercase block mb-1">Education</label><input value={editForm.education} onChange={e => setEditForm(p => ({ ...p, education: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none" /></div>
                  <div><label className="text-xs font-bold text-gray-400 uppercase block mb-1">University</label><input value={editForm.university} onChange={e => setEditForm(p => ({ ...p, university: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none" /></div>
                  <div><label className="text-xs font-bold text-gray-400 uppercase block mb-1">Experience</label><input value={editForm.experience} onChange={e => setEditForm(p => ({ ...p, experience: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none" /></div>
                  <div><label className="text-xs font-bold text-gray-400 uppercase block mb-1">Company</label><input value={editForm.company} onChange={e => setEditForm(p => ({ ...p, company: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none" /></div>
                </div>
                <div><label className="text-xs font-bold text-gray-400 uppercase block mb-1">Skills</label>
                  <div className="flex flex-wrap gap-2 mb-2">{editForm.skills.map(s => (<span key={s} className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400">{s}<button onClick={() => removeSkill(s)} className="ml-1 text-blue-400 hover:text-red-500">×</button></span>))}</div>
                  <div className="flex gap-2"><input value={newSkill} onChange={e => setNewSkill(e.target.value)} onKeyDown={e => e.key === 'Enter' && addSkill()} placeholder="Add skill..." className="flex-1 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white outline-none" /><button onClick={addSkill} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition">Add</button></div>
                </div>
                <button onClick={saveProfile} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all">Save Changes</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div><span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Education</span><p className="text-gray-900 dark:text-white font-medium mt-1">{profileData.education}</p><p className="text-sm text-gray-500">{profileData.university}</p></div>
                  <div><span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Experience</span><p className="text-gray-900 dark:text-white font-medium mt-1">{profileData.experience}</p><p className="text-sm text-gray-500">{profileData.company}</p></div>
                </div>
                <div><span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 block">Skills</span>
                  <div className="flex flex-wrap gap-2">{profileData.skills.map(s => (<span key={s} className="px-3 py-1.5 text-sm font-medium rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600">{s}</span>))}</div>
                </div>
              </div>
            )}
          </div>
        </div>
        ) : (
        <div className="flex-1 flex overflow-hidden bg-white dark:bg-gray-900">
          {/* Contacts List */}
          <div className="w-1/3 border-r border-gray-200 dark:border-gray-800 flex flex-col bg-gray-50/50 dark:bg-gray-950/50">
            <div className="p-4 border-b border-gray-200 dark:border-gray-800">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Conversations</h2>
            </div>
            <div className="flex-1 overflow-y-auto">
              {(() => {
                const uid = user?.uid
                const contactMap = new Map()
                messages.forEach(m => {
                  if (m.senderUid === uid) {
                    const cUid = m.targetUid || ''
                    const cName = m.targetName || m.target || 'Unknown'
                    if (cUid || cName !== 'Unknown') contactMap.set(cUid || cName, { uid: cUid, name: cName })
                  } else {
                    const cUid = m.senderUid || ''
                    const cName = m.senderName || 'Unknown'
                    if (cUid || cName !== 'Unknown') contactMap.set(cUid || cName, { uid: cUid, name: cName })
                  }
                })
                const contacts = Array.from(contactMap.values())
                return contacts.length === 0 ? (
                  <div className="p-6 text-center text-gray-500 text-sm">No conversations yet</div>
                ) : contacts.map(contact => (
                  <button
                    key={contact.uid || contact.name}
                    onClick={() => setMsgTarget(contact)}
                    className={`w-full text-left px-4 py-4 border-b border-gray-100 dark:border-gray-800 transition-colors ${(msgTarget?.uid && msgTarget.uid === contact.uid) || (!msgTarget?.uid && msgTarget?.name === contact.name) ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-500' : 'hover:bg-gray-100 dark:hover:bg-gray-800/50'}`}
                  >
                    <div className="font-semibold text-gray-900 dark:text-white truncate">{contact.name}</div>
                    <div className="text-xs text-gray-500 truncate">
                      {messages.filter(m => {
                        if (contact.uid && uid) return (m.senderUid === uid && m.targetUid === contact.uid) || (m.senderUid === contact.uid && m.targetUid === uid)
                        return m.senderName === contact.name || m.target === contact.name
                      }).pop()?.text || 'No messages'}
                    </div>
                  </button>
                ))
              })()}
            </div>
          </div>
          {/* Chat Window */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {!msgTarget ? (
              <div className="flex-1 flex items-center justify-center text-gray-400">Select a conversation to start messaging</div>
            ) : (
              <>
                <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                  <h3 className="font-bold text-gray-900 dark:text-white">{msgTarget.name}</h3>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {messages.filter(m => {
                    const uid = user?.uid
                    if (msgTarget.uid && uid) return (m.senderUid === uid && m.targetUid === msgTarget.uid) || (m.senderUid === msgTarget.uid && m.targetUid === uid)
                    return m.target === msgTarget.name || m.senderName === msgTarget.name
                  }).map(m => {
                    const isMe = user && m.senderUid === user.uid
                    return (
                      <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-md px-4 py-3 rounded-2xl text-sm ${isMe ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-tl-none'}`}>
                          <p>{m.text}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
                  <div className="flex gap-3">
                    <input value={msgInput} onChange={e => setMsgInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} placeholder="Type a message..." className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" />
                    <button onClick={sendMessage} className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all">Send</button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
        )}
      </main>

      {/* Pricing Modal */}
      {showPricing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-gray-900 w-full max-w-4xl rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-800 p-8 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-8">
              <div><h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">Choose Your Plan</h2><p className="text-gray-500 mt-1">Scale your interview practice to match your goals</p></div>
              <button onClick={() => setShowPricing(false)} className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 transition">✕</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.map(plan => (
                <div key={plan.name} className={`relative rounded-2xl p-6 border-2 transition-all hover:-translate-y-1 hover:shadow-lg ${plan.popular ? `border-${plan.color}-500 shadow-lg` : 'border-gray-200 dark:border-gray-700'}`}>
                  {plan.popular && <div className={`absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-${plan.color}-600 text-white text-xs font-bold rounded-full`}>Most Popular</div>}
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">{plan.name}</h3>
                  <div className="flex items-baseline gap-1 mb-4"><span className="text-4xl font-extrabold text-gray-900 dark:text-white">{plan.price}</span><span className="text-gray-500 text-sm">{plan.period}</span></div>
                  <ul className="space-y-3 mb-6">{plan.features.map((f, i) => (<li key={i} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400"><span className="text-green-500">✓</span>{f}</li>))}</ul>
                  <button className={`w-full py-3 rounded-xl font-bold transition-all ${plan.current ? 'bg-gray-100 dark:bg-gray-800 text-gray-500 cursor-default' : `bg-${plan.color}-600 text-white hover:bg-${plan.color}-700 shadow-md`}`}>
                    {plan.current ? 'Current Plan' : `Upgrade to ${plan.name}`}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
