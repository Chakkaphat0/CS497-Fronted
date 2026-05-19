import { useState, useMemo, useEffect } from 'react'
import { candidates, filterOptions } from '../data/mockData'
import { auth, db } from '../firebase'
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore'

// ─── Score Badge (mini) ─────────────────────────────────────────────
function MiniScoreBadge({ label, score }) {
  const getColor = (s) => {
    if (s >= 9.0) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
    if (s >= 8.0) return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'
    if (s >= 7.0) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
    return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
  }
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold rounded-md ${getColor(score)}`}>
      {label}: {score.toFixed(1)}
    </span>
  )
}

// ─── Candidate Card ─────────────────────────────────────────────────
function CandidateCard({ candidate, employerTier, onViewProfile, onMessage }) {
  const isBlurred = employerTier === 'free'
  const showDM = employerTier === 'enterprise'

  return (
    <div className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-100 dark:border-gray-700/50 p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
      <div className="flex items-start gap-4 mb-4">
        {/* Avatar */}
        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xl font-bold shadow-md shrink-0">
          {candidate.name.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className={`text-lg font-bold text-gray-900 dark:text-white truncate ${isBlurred ? 'blur-sm select-none' : ''}`}>
              {candidate.name}
            </h3>
            {candidate.tier === 'premium' && (
              <span className="px-2 py-0.5 text-xs font-bold rounded bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">PRO</span>
            )}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{candidate.title}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{candidate.university} · {candidate.experience}</p>
        </div>
        {/* Overall Score */}
        <div className="text-center shrink-0">
          <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-lg font-extrabold shadow-inner ${
            candidate.scores.overall >= 9.0
              ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 ring-2 ring-emerald-200 dark:ring-emerald-800'
              : candidate.scores.overall >= 8.0
              ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 ring-2 ring-blue-200 dark:ring-blue-800'
              : 'bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-400 ring-2 ring-gray-200 dark:ring-gray-700'
          }`}>
            {candidate.scores.overall.toFixed(1)}
          </div>
          <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mt-1 block">Score</span>
        </div>
      </div>

      {/* Score Badges */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        <MiniScoreBadge label="Tech" score={candidate.scores.technical} />
        <MiniScoreBadge label="Comm" score={candidate.scores.communication} />
        <MiniScoreBadge label="Problem" score={candidate.scores.problemSolving} />
      </div>

      {/* Skills */}
      <div className="flex flex-wrap gap-1.5 mb-5">
        {candidate.skills.slice(0, 4).map(s => (
          <span key={s} className="px-2 py-0.5 text-xs rounded-md bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 font-medium">{s}</span>
        ))}
        {candidate.skills.length > 4 && (
          <span className="px-2 py-0.5 text-xs rounded-md bg-gray-100 dark:bg-gray-700 text-gray-500 font-medium">+{candidate.skills.length - 4}</span>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => onViewProfile(candidate)}
          className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
            isBlurred
              ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
              : 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50'
          }`}
          disabled={isBlurred}
        >
          {isBlurred ? '🔒 Upgrade to View' : 'View Profile'}
        </button>
        {showDM && (
          <button
            onClick={() => onMessage(candidate)}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-all"
          >
            💬 Message
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Main Employer Hub ──────────────────────────────────────────────
export default function EmployerHub({ onLogout, onChangeRole, isDark, toggleTheme }) {
  const [employerTier, setEmployerTier] = useState('free')
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [activeTab, setActiveTab] = useState('search') // 'search','analytics','messages'
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTitle, setSelectedTitle] = useState('')
  const [selectedSkills, setSelectedSkills] = useState([])
  const [selectedUniversity, setSelectedUniversity] = useState('')
  const [scoreRange, setScoreRange] = useState([0, 10])
  const [showFilters, setShowFilters] = useState(true)
  const [skillSearch, setSkillSearch] = useState('')
  const [messages, setMessages] = useState([])
  const [msgInput, setMsgInput] = useState('')
  const [msgTarget, setMsgTarget] = useState(null)
  const [realCandidates, setRealCandidates] = useState([])
  const [dbPositions, setDbPositions] = useState([])

  // Load real candidates from scores
  useEffect(() => {
    const q = query(collection(db, 'interviewScores'), orderBy('timestamp', 'desc'))
    const unsub = onSnapshot(q, snap => {
      const grouped = {}
      snap.docs.forEach(docSnap => {
        const data = docSnap.data()
        if (!data.userId) return
        if (!grouped[data.userId]) {
          grouped[data.userId] = {
            id: data.userId,
            name: data.displayName || 'Unknown Candidate',
            title: 'Candidate',
            university: 'Other',
            skills: ['Communication'],
            experience: '1 year',
            tier: 'free',
            scores: data.scores || {},
            overallSum: 0,
            count: 0,
            latestScores: data.scores || {}
          }
        }
        grouped[data.userId].overallSum += (data.overall || 0)
        grouped[data.userId].count += 1
      })
      const list = Object.values(grouped).map(c => ({
        ...c,
        scores: { ...c.latestScores, overall: c.overallSum / c.count }
      }))
      setRealCandidates(list)
    }, () => {})
    return unsub
  }, [])

  // Load messages from Firebase
  useEffect(() => {
    const q = query(collection(db, 'employerMessages'), orderBy('timestamp', 'asc'))
    const unsub = onSnapshot(q, snap => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    }, () => {})
    
    // Load positions
    const unsubPos = onSnapshot(collection(db, 'positions'), snap => {
      setDbPositions(snap.docs.map(d => d.data().title))
    }, () => {})
    
    return () => { unsub(); unsubPos(); }
  }, [])

  const sendMessage = async () => {
    if (!msgInput.trim() || !auth.currentUser) return
    const user = auth.currentUser
    await addDoc(collection(db, 'employerMessages'), {
      senderUid: user.uid,
      senderName: user.displayName || user.email?.split('@')[0] || 'Employer',
      senderEmail: user.email || '',
      target: msgTarget?.name || 'General',
      text: msgInput,
      timestamp: serverTimestamp()
    })
    setMsgInput('')
  }

  const filteredSkillOptions = filterOptions.skills.filter(s => s.toLowerCase().includes(skillSearch.toLowerCase()))

  // Filtered candidates
  const filteredCandidates = useMemo(() => {
    return realCandidates.filter(c => {
      if (searchQuery && !c.name.toLowerCase().includes(searchQuery.toLowerCase()) && !c.title.toLowerCase().includes(searchQuery.toLowerCase())) return false
      if (selectedTitle && c.title !== selectedTitle) return false
      if (selectedUniversity && c.university !== selectedUniversity) return false
      if (selectedSkills.length > 0 && !selectedSkills.some(s => c.skills.includes(s))) return false
      if (c.scores.overall < scoreRange[0] || c.scores.overall > scoreRange[1]) return false
      return true
    })
  }, [realCandidates, searchQuery, selectedTitle, selectedSkills, selectedUniversity, scoreRange])

  const toggleSkill = (skill) => {
    setSelectedSkills(prev =>
      prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
    )
  }

  const clearFilters = () => {
    setSearchQuery('')
    setSelectedTitle('')
    setSelectedSkills([])
    setSelectedUniversity('')
    setScoreRange([0, 10])
  }

  return (
    <div className={`flex h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-300 font-sans ${isDark ? 'dark' : ''}`}>
      {/* ── Left Sidebar ─────────────────────────────────────────── */}
      <aside className="w-[280px] bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 p-6 flex flex-col shadow-sm shrink-0 hidden lg:flex">
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center text-white shadow-md text-sm font-bold">
            AI
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">AI Interview</h1>
        </div>

        <nav className="space-y-2">
          {[{id:'search',icon:'🔍',label:'Talent Search'},{id:'analytics',icon:'📊',label:'Analytics'},{id:'messages',icon:'💬',label:'Messages'}].map(tab=>(
            <button key={tab.id} onClick={()=>setActiveTab(tab.id)} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-medium transition-all ${activeTab===tab.id?'bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400':'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}>
              <span className="text-xl">{tab.icon}</span> {tab.label}
            </button>
          ))}
        </nav>

        {/* Tier Switcher (for demo) */}
        <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-3">Demo: Switch Tier</span>
          <div className="grid grid-cols-3 gap-1 bg-gray-200 dark:bg-gray-700 rounded-lg p-1">
            {['free', 'premium', 'enterprise'].map(tier => (
              <button
                key={tier}
                onClick={() => setEmployerTier(tier)}
                className={`py-1.5 rounded-md text-xs font-bold capitalize transition-all ${
                  employerTier === tier
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                }`}
              >
                {tier}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-auto space-y-2">
          <button onClick={onChangeRole} className="w-full flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 py-3 rounded-xl font-medium transition-all text-sm">
            🔄 Switch Role
          </button>
          <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 py-3 rounded-xl font-medium transition-all">
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main Content ─────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <header className="h-20 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-8 z-10 shrink-0">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{activeTab==='search'?'Talent Search':activeTab==='analytics'?'Analytics':'Messages'}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {activeTab==='search' && <>{filteredCandidates.length} candidate{filteredCandidates.length!==1?'s':''} found · </>}
              <span className={`font-bold capitalize ${employerTier==='enterprise'?'text-purple-500':employerTier==='premium'?'text-blue-500':'text-gray-400'}`}>{employerTier} Plan</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            {employerTier === 'free' && (<button onClick={() => setShowUpgradeModal(true)} className="px-5 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all">✨ Upgrade</button>)}
            <button onClick={toggleTheme} className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition">{isDark ? '☀️' : '🌙'}</button>
          </div>
        </header>

        {/* TAB: Search */}
        {activeTab==='search' && (
        <div className="flex-1 flex overflow-hidden">
          <div className={`${showFilters ? 'w-72' : 'w-0'} transition-all duration-300 overflow-hidden border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shrink-0`}>
            <div className="p-6 space-y-6 w-72 h-full overflow-y-auto">
              <div className="flex items-center justify-between"><h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Filters</h3><button onClick={clearFilters} className="text-xs text-blue-500 hover:text-blue-600 font-medium">Clear All</button></div>
              <div><label className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-2 block uppercase tracking-wider">Search</label><input type="text" value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder="Name or title..." className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none" /></div>
              <div><label className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-2 block uppercase tracking-wider">Job Title</label><select value={selectedTitle} onChange={e => setSelectedTitle(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white appearance-none outline-none focus:ring-2 focus:ring-purple-500">
                    <option value="">All Positions</option>
                    {[...new Set([...filterOptions.jobTitles, ...dbPositions])].map(t => <option key={t} value={t}>{t}</option>)}
                  </select></div>
              <div><label className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-2 block uppercase tracking-wider">University</label><select value={selectedUniversity} onChange={e=>setSelectedUniversity(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none"><option value="">All Universities</option>{filterOptions.universities.map(u=><option key={u} value={u}>{u}</option>)}</select></div>
              <div><label className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-2 block uppercase tracking-wider">AI Score: <span className="text-purple-500">{scoreRange[0].toFixed(1)} – {scoreRange[1].toFixed(1)}</span></label><div className="space-y-3"><div className="flex items-center gap-3"><span className="text-xs text-gray-400 w-8">Min</span><input type="range" min="0" max="10" step="0.5" value={scoreRange[0]} onChange={e=>setScoreRange([Math.min(parseFloat(e.target.value),scoreRange[1]),scoreRange[1]])} className="flex-1 accent-purple-600"/></div><div className="flex items-center gap-3"><span className="text-xs text-gray-400 w-8">Max</span><input type="range" min="0" max="10" step="0.5" value={scoreRange[1]} onChange={e=>setScoreRange([scoreRange[0],Math.max(parseFloat(e.target.value),scoreRange[0])])} className="flex-1 accent-purple-600"/></div></div></div>
              <div><label className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-2 block uppercase tracking-wider">Skills</label><input type="text" value={skillSearch} onChange={e=>setSkillSearch(e.target.value)} placeholder="Search skills..." className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs text-gray-900 dark:text-white mb-2 outline-none focus:ring-2 focus:ring-purple-500"/><div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">{filteredSkillOptions.map(skill=>(<button key={skill} onClick={()=>toggleSkill(skill)} className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all border ${selectedSkills.includes(skill)?'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400 border-purple-300 dark:border-purple-700':'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-purple-300'}`}>{skill}</button>))}</div></div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-6 lg:p-8">
            {filteredCandidates.length===0?(<div className="text-center py-20"><div className="text-5xl mb-4">🔍</div><h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No candidates found</h3><p className="text-gray-500">Try adjusting your filters.</p><button onClick={clearFilters} className="mt-4 px-6 py-2.5 rounded-xl bg-purple-600 text-white font-medium">Clear All Filters</button></div>):(
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">{filteredCandidates.map(c=>(<CandidateCard key={c.id} candidate={c} employerTier={employerTier} onViewProfile={()=>{}} onMessage={(cand)=>{setMsgTarget(cand);setActiveTab('messages')}}/>))}</div>
            )}
          </div>
        </div>
        )}

        {/* TAB: Analytics */}
        {activeTab==='analytics' && (
        <div className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[{icon:'👥',label:'Total Candidates',value:realCandidates.length},{icon:'🏆',label:'Avg Score',value:(realCandidates.length ? (realCandidates.reduce((a,c)=>a+c.scores.overall,0)/realCandidates.length).toFixed(1) : 0)},{icon:'📈',label:'High Performers',value:realCandidates.filter(c=>c.scores.overall>=8).length},{icon:'🎓',label:'Universities',value:[...new Set(realCandidates.map(c=>c.university))].length}].map((s,i)=>(
              <div key={i} className="bg-white dark:bg-gray-800/80 rounded-2xl p-5 border border-gray-100 dark:border-gray-700/50 hover:shadow-lg transition-all">
                <div className="flex items-center gap-2 mb-1"><span className="text-lg">{s.icon}</span><span className="text-xs font-bold text-gray-400 uppercase">{s.label}</span></div>
                <p className="text-3xl font-extrabold text-gray-900 dark:text-white">{s.value}</p>
              </div>
            ))}
          </div>
          <div className="bg-white dark:bg-gray-800/80 rounded-2xl p-6 border border-gray-100 dark:border-gray-700/50">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Score Distribution by Title</h3>
            <div className="space-y-4">{[...new Set(realCandidates.map(c=>c.title))].map(title=>{const arr=realCandidates.filter(c=>c.title===title); const avg=arr.reduce((a,c)=>a+c.scores.overall,0)/arr.length; return(<div key={title}><div className="flex justify-between mb-1"><span className="text-sm font-medium text-gray-700 dark:text-gray-300">{title}</span><span className="text-sm font-bold text-gray-900 dark:text-white">{avg.toFixed(1)} ({arr.length})</span></div><div className="w-full h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500" style={{width:`${(avg/10)*100}%`}}/></div></div>)})}</div>
          </div>
          <div className="bg-white dark:bg-gray-800/80 rounded-2xl p-6 border border-gray-100 dark:border-gray-700/50">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">University Comparison</h3>
            <div className="space-y-4">{[...new Set(realCandidates.map(c=>c.university))].map(uni=>{const arr=realCandidates.filter(c=>c.university===uni); const avg=arr.reduce((a,c)=>a+c.scores.overall,0)/arr.length; return(<div key={uni}><div className="flex justify-between mb-1"><span className="text-sm font-medium text-gray-700 dark:text-gray-300">{uni}</span><span className="text-sm font-bold text-gray-900 dark:text-white">{avg.toFixed(1)} ({arr.length} students)</span></div><div className="w-full h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-500" style={{width:`${(avg/10)*100}%`}}/></div></div>)})}</div>
          </div>
          <div className="bg-white dark:bg-gray-800/80 rounded-2xl p-6 border border-gray-100 dark:border-gray-700/50">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Top Skills Across Candidates</h3>
            <div className="flex flex-wrap gap-2">{Object.entries(realCandidates.reduce((acc,c)=>{c.skills.forEach(s=>{acc[s]=(acc[s]||0)+1});return acc},{})).sort((a,b)=>b[1]-a[1]).map(([skill,count])=>(<span key={skill} className="px-3 py-1.5 rounded-lg bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-sm font-medium border border-purple-200 dark:border-purple-800">{skill} <span className="text-xs opacity-60">({count})</span></span>))}</div>
          </div>
        </div>
        )}

        {/* TAB: Messages */}
        {activeTab==='messages' && (
        <div className="flex-1 flex overflow-hidden bg-white dark:bg-gray-900">
          {/* Contacts List */}
          <div className="w-1/3 border-r border-gray-200 dark:border-gray-800 flex flex-col bg-gray-50/50 dark:bg-gray-950/50">
            <div className="p-4 border-b border-gray-200 dark:border-gray-800">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Conversations</h2>
            </div>
            <div className="flex-1 overflow-y-auto">
              {Array.from(new Set(messages.map(m => m.senderUid === auth.currentUser?.uid ? m.target : m.senderName))).filter(Boolean).map(contact => (
                <button
                  key={contact}
                  onClick={() => setMsgTarget({ name: contact })}
                  className={`w-full text-left px-4 py-4 border-b border-gray-100 dark:border-gray-800 transition-colors ${msgTarget?.name === contact ? 'bg-purple-50 dark:bg-purple-900/20 border-l-4 border-l-purple-500' : 'hover:bg-gray-100 dark:hover:bg-gray-800/50'}`}
                >
                  <div className="font-semibold text-gray-900 dark:text-white truncate">{contact}</div>
                  <div className="text-xs text-gray-500 truncate">
                    {messages.filter(m => m.senderName === contact || m.target === contact).pop()?.text || 'No messages'}
                  </div>
                </button>
              ))}
              {Array.from(new Set(messages.map(m => m.senderUid === auth.currentUser?.uid ? m.target : m.senderName))).filter(Boolean).length === 0 && (
                <div className="p-6 text-center text-gray-500 text-sm">No conversations yet</div>
              )}
            </div>
          </div>
          {/* Chat Window */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {!msgTarget ? (
              <div className="flex-1 flex items-center justify-center text-gray-400">Select a candidate to start messaging</div>
            ) : (
              <>
                <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                  <h3 className="font-bold text-gray-900 dark:text-white">{msgTarget.name}</h3>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {messages.filter(m => m.target === msgTarget.name || (m.senderUid !== auth.currentUser?.uid && m.senderName === msgTarget.name)).map(m => {
                    const isMe = auth.currentUser && m.senderUid === auth.currentUser.uid
                    return (
                      <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-md px-4 py-3 rounded-2xl text-sm ${isMe ? 'bg-purple-600 text-white rounded-tr-none' : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-tl-none'}`}>
                          <p>{m.text}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
                  <div className="flex gap-3">
                    <input value={msgInput} onChange={e => setMsgInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} placeholder="Type a message..." className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500" />
                    <button onClick={sendMessage} className="px-6 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-all">Send</button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
        )}

      </main>

      {/* ── Enterprise Upgrade Modal ──────────────────────────────── */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            {/* Modal Header */}
            <div className="relative p-8 bg-gradient-to-r from-purple-600 to-pink-600 text-white">
              <button onClick={() => setShowUpgradeModal(false)} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
              <div className="text-3xl mb-3">🏢</div>
              <h3 className="text-2xl font-extrabold mb-2">Enterprise Plan</h3>
              <p className="opacity-80">Unlock the full power of AI-driven hiring</p>
            </div>

            {/* Modal Body */}
            <div className="p-8 space-y-5">
              {[
                { icon: '👤', text: 'View full candidate names & profiles' },
                { icon: '🎥', text: 'Access candidate AI interview video replays' },
                { icon: '💬', text: 'Direct messaging with candidates' },
                { icon: '📊', text: 'Advanced analytics & reporting' },
                { icon: '🎯', text: 'Priority candidate matching' },
              ].map((feature, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center text-lg shrink-0">{feature.icon}</div>
                  <span className="text-gray-700 dark:text-gray-300 font-medium">{feature.text}</span>
                </div>
              ))}

              <div className="pt-4 space-y-3">
                <button
                  onClick={() => { setEmployerTier('enterprise'); setShowUpgradeModal(false) }}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-lg shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
                >
                  Upgrade to Enterprise — ฿9,900/mo
                </button>
                <button
                  onClick={() => { setEmployerTier('premium'); setShowUpgradeModal(false) }}
                  className="w-full py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
                >
                  Try Premium — ฿2,900/mo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
