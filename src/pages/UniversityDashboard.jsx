import { useState, useEffect, useRef } from 'react'
import { universityData, candidates } from '../data/mockData'
import { db, auth } from '../firebase'
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc, query, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore'

// ─── Simple Bar Chart (Pure CSS) ────────────────────────────────────
function BarChart({ data, labelKey, valueKey, maxValue = 10, barColor = 'from-blue-500 to-cyan-500' }) {
  return (
    <div className="space-y-3">
      {data.map((item, i) => (
        <div key={i} className="group">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate mr-4">{item[labelKey]}</span>
            <span className="text-sm font-bold text-gray-900 dark:text-white tabular-nums">{item[valueKey].toFixed(1)}</span>
          </div>
          <div className="w-full h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-all duration-1000 ease-out`}
              style={{ width: `${(item[valueKey] / maxValue) * 100}%`, transitionDelay: `${i * 100}ms` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Line Chart (SVG) ───────────────────────────────────────────────
function LineChart({ data, labelKey, valueKey }) {
  const width = 600
  const height = 200
  const padding = { top: 20, right: 20, bottom: 30, left: 35 }

  const values = data.map(d => d[valueKey])
  const minVal = Math.floor(Math.min(...values) * 10) / 10 - 0.5
  const maxVal = Math.ceil(Math.max(...values) * 10) / 10 + 0.5

  const xScale = (i) => padding.left + (i / (data.length - 1)) * (width - padding.left - padding.right)
  const yScale = (v) => height - padding.bottom - ((v - minVal) / (maxVal - minVal)) * (height - padding.top - padding.bottom)

  const linePath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScale(d[valueKey])}`).join(' ')
  const areaPath = linePath + ` L ${xScale(data.length - 1)} ${height - padding.bottom} L ${xScale(0)} ${height - padding.bottom} Z`

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(59 130 246)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="rgb(59 130 246)" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="strokeGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgb(59 130 246)" />
          <stop offset="100%" stopColor="rgb(6 182 212)" />
        </linearGradient>
      </defs>

      {/* Grid lines */}
      {[...Array(5)].map((_, i) => {
        const val = minVal + (i / 4) * (maxVal - minVal)
        const y = yScale(val)
        return (
          <g key={i}>
            <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="currentColor" className="text-gray-200 dark:text-gray-700" strokeWidth="1" strokeDasharray="4 4" />
            <text x={padding.left - 5} y={y + 4} textAnchor="end" className="fill-gray-400 dark:fill-gray-500" fontSize="10">{val.toFixed(1)}</text>
          </g>
        )
      })}

      {/* Area */}
      <path d={areaPath} fill="url(#lineGrad)" />

      {/* Line */}
      <path d={linePath} fill="none" stroke="url(#strokeGrad)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

      {/* Points */}
      {data.map((d, i) => (
        <g key={i}>
          <circle cx={xScale(i)} cy={yScale(d[valueKey])} r="4" fill="white" stroke="rgb(59 130 246)" strokeWidth="2" className="hover:r-6 transition-all" />
          <text x={xScale(i)} y={height - 10} textAnchor="middle" className="fill-gray-400 dark:fill-gray-500" fontSize="10">{d[labelKey]}</text>
        </g>
      ))}
    </svg>
  )
}

// ─── Donut Chart (SVG) ──────────────────────────────────────────────
function DonutChart({ value, max = 10, label, color = '#3b82f6' }) {
  const size = 120
  const strokeWidth = 10
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const [offset, setOffset] = useState(circumference)

  useEffect(() => {
    const timer = setTimeout(() => {
      setOffset(circumference - (value / max) * circumference)
    }, 200)
    return () => clearTimeout(timer)
  }, [value, max, circumference])

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" className="text-gray-100 dark:text-gray-700" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s ease-out' }}
        />
      </svg>
      <div className="text-center -mt-[76px] mb-8">
        <span className="text-2xl font-extrabold text-gray-900 dark:text-white">{value.toFixed(1)}</span>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{label}</p>
      </div>
    </div>
  )
}

// ─── Main University Dashboard ──────────────────────────────────────
export default function UniversityDashboard({ onLogout, onChangeRole, isDark, toggleTheme }) {
  const uniData = universityData
  const [selectedDept, setSelectedDept] = useState(null)
  const [activeTab, setActiveTab] = useState('analytics')
  const [universities, setUniversities] = useState([])
  const [selectedUni, setSelectedUni] = useState('')
  const [fbCandidates, setFbCandidates] = useState([])
  const [newDeptName, setNewDeptName] = useState('')
  const [uniName, setUniName] = useState(uniData.name)
  const [messages, setMessages] = useState([])
  const [msgInput, setMsgInput] = useState('')
  const [msgTarget, setMsgTarget] = useState(null)

  useEffect(() => {
    getDocs(collection(db, 'universities')).then(snap => {
      setUniversities(snap.docs.map(d => ({id:d.id,...d.data()})))
    }).catch(()=>{})
    const qScores = query(collection(db, 'interviewScores'), orderBy('timestamp', 'desc'))
    const unsubScores = onSnapshot(qScores, snap => {
      const grouped = {}
      snap.docs.forEach(docSnap => {
        const data = docSnap.data()
        if (!data.userId) return
        if (!grouped[data.userId]) {
          grouped[data.userId] = {
            id: data.userId,
            name: data.displayName || 'Unknown Student',
            title: 'Student',
            university: data.universityName || 'Unknown University',
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
        scores: { ...c.latestScores, overall: c.overallSum / c.count },
        interviewCount: c.count
      }))
      setFbCandidates(list)
    }, () => {})
    
    // Load messages from Firebase
    const qMsg = query(collection(db, 'employerMessages'), orderBy('timestamp', 'asc'))
    const unsubMsg = onSnapshot(qMsg, snap => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    }, () => {})
    
    return () => { unsubMsg(); unsubScores(); }
  }, [])

  const sendMessage = async () => {
    if (!msgInput.trim() || !auth.currentUser) return
    const user = auth.currentUser
    await addDoc(collection(db, 'employerMessages'), {
      senderUid: user.uid,
      senderName: user.displayName || user.email?.split('@')[0] || 'University Admin',
      senderEmail: user.email || '',
      target: msgTarget?.name || 'General',
      text: msgInput,
      timestamp: serverTimestamp()
    })
    setMsgInput('')
  }

  const topStudents = [...candidates].sort((a,b)=>b.scores.overall-a.scores.overall).slice(0,6)
  const overallAvg = uniData.departments.reduce((sum,d)=>sum+d.avgScore,0)/uniData.departments.length

  return (
    <div className={`flex h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-300 font-sans ${isDark ? 'dark' : ''}`}>
      {/* ── Left Sidebar ─────────────────────────────────────────── */}
      <aside className="w-[280px] bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 p-6 flex flex-col shadow-sm shrink-0 hidden lg:flex">
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md text-sm font-bold">
            AI
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">AI Interview</h1>
        </div>

        <nav className="space-y-2">
          {[{id:'analytics',icon:'📊',label:'Analytics'},{id:'students',icon:'🎓',label:'Students'},{id:'departments',icon:'🏛️',label:'Departments'},{id:'messages',icon:'💬',label:'Messages'},{id:'settings',icon:'⚙️',label:'Settings'}].map(tab=>(
            <button key={tab.id} onClick={()=>setActiveTab(tab.id)} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-medium transition-all ${activeTab===tab.id?'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400':'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}>
              <span className="text-xl">{tab.icon}</span> {tab.label}
            </button>
          ))}
        </nav>

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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{activeTab==='analytics'?'University Analytics':activeTab==='students'?'Students':activeTab==='departments'?'Departments':activeTab==='messages'?'Messages':'Settings'}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{uniName}</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={toggleTheme} className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition">
              {isDark ? '☀️' : '🌙'}
            </button>
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white flex items-center justify-center font-bold shadow-md text-sm">
              🏛️
            </div>
          </div>
        </header>

        {/* Analytics Tab */}
        {activeTab==='analytics' && <div className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-6">
          {/* ── Stat Cards ──────────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800/80 rounded-2xl p-5 border border-gray-100 dark:border-gray-700/50 hover:shadow-lg transition-all">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">🎓</span>
                <span className="text-xs font-bold text-gray-400 uppercase">Total Students</span>
              </div>
              <p className="text-3xl font-extrabold text-gray-900 dark:text-white">{uniData.totalStudents.toLocaleString()}</p>
            </div>
            <div className="bg-white dark:bg-gray-800/80 rounded-2xl p-5 border border-gray-100 dark:border-gray-700/50 hover:shadow-lg transition-all">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">📊</span>
                <span className="text-xs font-bold text-gray-400 uppercase">Avg. Score</span>
              </div>
              <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">{overallAvg.toFixed(1)}</p>
            </div>
            <div className="bg-white dark:bg-gray-800/80 rounded-2xl p-5 border border-gray-100 dark:border-gray-700/50 hover:shadow-lg transition-all">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">🏛️</span>
                <span className="text-xs font-bold text-gray-400 uppercase">Departments</span>
              </div>
              <p className="text-3xl font-extrabold text-gray-900 dark:text-white">{uniData.departments.length}</p>
            </div>
            <div className="bg-white dark:bg-gray-800/80 rounded-2xl p-5 border border-gray-100 dark:border-gray-700/50 hover:shadow-lg transition-all">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">🏆</span>
                <span className="text-xs font-bold text-gray-400 uppercase">Top Score</span>
              </div>
              <p className="text-3xl font-extrabold text-blue-600 dark:text-blue-400">
                {Math.max(...uniData.departments.map(d => d.topScore)).toFixed(1)}
              </p>
            </div>
          </div>

          {/* ── Charts Row ──────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly Trend */}
            <div className="bg-white dark:bg-gray-800/80 rounded-2xl p-6 border border-gray-100 dark:border-gray-700/50">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">📈 Score Trend (Monthly)</h3>
              <LineChart data={uniData.monthlyScores} labelKey="month" valueKey="score" />
            </div>

            {/* Skill Radar via Donuts */}
            <div className="bg-white dark:bg-gray-800/80 rounded-2xl p-6 border border-gray-100 dark:border-gray-700/50">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">🎯 Skill Distribution</h3>
              <div className="grid grid-cols-3 gap-4 place-items-center">
                {uniData.skillDistribution.map((s, i) => {
                  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899']
                  return <DonutChart key={i} value={s.score} label={s.skill} color={colors[i % colors.length]} />
                })}
              </div>
            </div>
          </div>

          {/* ── Department Breakdown ─────────────────────────────── */}
          <div className="bg-white dark:bg-gray-800/80 rounded-2xl p-6 border border-gray-100 dark:border-gray-700/50">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-5">🏛️ Department Breakdown</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-700">
                    <th className="pb-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Department</th>
                    <th className="pb-3 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Students</th>
                    <th className="pb-3 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Avg Score</th>
                    <th className="pb-3 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Top Score</th>
                    <th className="pb-3 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Trend</th>
                    <th className="pb-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Performance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {uniData.departments.map((dept, i) => (
                    <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer" onClick={() => setSelectedDept(selectedDept === i ? null : i)}>
                      <td className="py-4">
                        <span className="font-semibold text-gray-900 dark:text-white">{dept.name}</span>
                      </td>
                      <td className="py-4 text-center text-gray-600 dark:text-gray-400 font-medium">{dept.students}</td>
                      <td className="py-4 text-center">
                        <span className={`font-bold ${dept.avgScore >= 8.5 ? 'text-emerald-600 dark:text-emerald-400' : dept.avgScore >= 8.0 ? 'text-blue-600 dark:text-blue-400' : 'text-amber-600 dark:text-amber-400'}`}>
                          {dept.avgScore.toFixed(1)}
                        </span>
                      </td>
                      <td className="py-4 text-center font-bold text-gray-900 dark:text-white">{dept.topScore.toFixed(1)}</td>
                      <td className="py-4 text-center">
                        <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${
                          dept.trend.startsWith('+')
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                        }`}>
                          {dept.trend}
                        </span>
                      </td>
                      <td className="py-4">
                        <div className="w-full max-w-[120px] h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${dept.avgScore >= 8.5 ? 'bg-emerald-500' : dept.avgScore >= 8.0 ? 'bg-blue-500' : 'bg-amber-500'}`}
                            style={{ width: `${(dept.avgScore / 10) * 100}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Top Students Table ───────────────────────────────── */}
          <div className="bg-white dark:bg-gray-800/80 rounded-2xl p-6 border border-gray-100 dark:border-gray-700/50">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">🏆 Top Performing Students</h3>
              <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">Based on AI Interview Scores</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-700">
                    <th className="pb-3 text-xs font-bold text-gray-400 uppercase tracking-wider w-10">#</th>
                    <th className="pb-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Student</th>
                    <th className="pb-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Department</th>
                    <th className="pb-3 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Overall</th>
                    <th className="pb-3 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Tech</th>
                    <th className="pb-3 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Comm</th>
                    <th className="pb-3 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Problem</th>
                    <th className="pb-3 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Interviews</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {topStudents.map((student, i) => (
                    <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="py-4">
                        <span className={`w-7 h-7 inline-flex items-center justify-center rounded-lg text-xs font-bold ${
                          i === 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' :
                          i === 1 ? 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300' :
                          i === 2 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400' :
                          'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                        }`}>
                          {i + 1}
                        </span>
                      </td>
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-sm font-bold shadow-sm">
                            {student.name.charAt(0)}
                          </div>
                          <div>
                            <span className="font-semibold text-gray-900 dark:text-white text-sm">{student.name}</span>
                            <p className="text-xs text-gray-400 dark:text-gray-500">{student.title}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 text-sm text-gray-600 dark:text-gray-400">{student.department}</td>
                      <td className="py-4 text-center">
                        <span className={`px-2 py-0.5 rounded-md text-sm font-extrabold ${
                          student.scores.overall >= 9.0 ? 'text-emerald-600 dark:text-emerald-400' :
                          student.scores.overall >= 8.0 ? 'text-blue-600 dark:text-blue-400' :
                          'text-amber-600 dark:text-amber-400'
                        }`}>
                          {student.scores.overall.toFixed(1)}
                        </span>
                      </td>
                      <td className="py-4 text-center text-sm font-medium text-gray-700 dark:text-gray-300">{student.scores.technical.toFixed(1)}</td>
                      <td className="py-4 text-center text-sm font-medium text-gray-700 dark:text-gray-300">{student.scores.communication.toFixed(1)}</td>
                      <td className="py-4 text-center text-sm font-medium text-gray-700 dark:text-gray-300">{student.scores.problemSolving.toFixed(1)}</td>
                      <td className="py-4 text-center text-sm text-gray-500 dark:text-gray-400">{student.interviewCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>}

        {/* Students Tab */}
        {activeTab==='students' && <div className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-6">
          <div className="bg-white dark:bg-gray-800/80 rounded-2xl p-6 border border-gray-100 dark:border-gray-700/50">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">All Students (Firebase)</h3>
            <div className="overflow-x-auto"><table className="w-full text-left"><thead><tr className="border-b border-gray-100 dark:border-gray-700"><th className="pb-3 text-xs font-bold text-gray-400 uppercase">Name</th><th className="pb-3 text-xs font-bold text-gray-400 uppercase">Title</th><th className="pb-3 text-xs font-bold text-gray-400 uppercase">University</th><th className="pb-3 text-xs font-bold text-gray-400 uppercase text-center">Score</th><th className="pb-3 text-xs font-bold text-gray-400 uppercase text-center">Interviews</th><th className="pb-3 text-xs font-bold text-gray-400 uppercase text-center">Actions</th></tr></thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {(fbCandidates.length>0?fbCandidates:candidates).filter(s => s.university === uniName || s.university === 'Unknown University').map((s,i)=>(<tr key={s.id||i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50"><td className="py-3"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold">{s.name?.charAt(0)}</div><span className="font-medium text-gray-900 dark:text-white text-sm">{s.name}</span></div></td><td className="py-3 text-sm text-gray-600 dark:text-gray-400">{s.title}</td><td className="py-3 text-sm text-gray-600 dark:text-gray-400">{s.university}</td><td className="py-3 text-center font-bold text-emerald-600">{(s.scores?.overall||0).toFixed(1)}</td><td className="py-3 text-center text-gray-500">{s.interviewCount||0}</td><td className="py-3 text-center"><button className="px-3 py-1.5 text-xs font-bold bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors" onClick={() => { setMsgTarget(s); setActiveTab('messages'); }}>Message</button></td></tr>))}
            </tbody></table></div>
          </div>
        </div>}

        {/* Departments Tab */}
        {activeTab==='departments' && <div className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-6">
          <div className="bg-white dark:bg-gray-800/80 rounded-2xl p-6 border border-gray-100 dark:border-gray-700/50">
            <div className="flex items-center justify-between mb-5"><h3 className="text-lg font-bold text-gray-900 dark:text-white">Manage Departments</h3></div>
            <div className="flex gap-3 mb-6"><input value={newDeptName} onChange={e=>setNewDeptName(e.target.value)} placeholder="New department name..." className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white outline-none"/><button onClick={()=>{if(newDeptName.trim()){uniData.departments.push({name:newDeptName.trim(),students:0,avgScore:0,topScore:0,trend:'+0.0'});setNewDeptName('')}}} className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition">+ Add</button></div>
            <div className="space-y-3">{uniData.departments.map((d,i)=>(<div key={i} className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"><div><h4 className="font-semibold text-gray-900 dark:text-white">{d.name}</h4><p className="text-xs text-gray-500">{d.students} students · Avg: {d.avgScore.toFixed(1)}</p></div><span className={`px-2 py-0.5 rounded-md text-xs font-bold ${d.trend?.startsWith('+')?'bg-emerald-100 text-emerald-700':'bg-red-100 text-red-700'}`}>{d.trend}</span></div>))}</div>
          </div>
        </div>}

        {/* Messages Tab */}
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
                  className={`w-full text-left px-4 py-4 border-b border-gray-100 dark:border-gray-800 transition-colors ${msgTarget?.name === contact ? 'bg-emerald-50 dark:bg-emerald-900/20 border-l-4 border-l-emerald-500' : 'hover:bg-gray-100 dark:hover:bg-gray-800/50'}`}
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
              <div className="flex-1 flex items-center justify-center text-gray-400">Select a student to start messaging</div>
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
                        <div className={`max-w-md px-4 py-3 rounded-2xl text-sm ${isMe ? 'bg-emerald-600 text-white rounded-tr-none' : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-tl-none'}`}>
                          <p>{m.text}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
                  <div className="flex gap-3">
                    <input value={msgInput} onChange={e => setMsgInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} placeholder="Type a message..." className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500" />
                    <button onClick={sendMessage} className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all">Send</button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
        )}

        {/* Settings Tab */}
        {activeTab==='settings' && <div className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-6">
          <div className="bg-white dark:bg-gray-800/80 rounded-2xl p-6 border border-gray-100 dark:border-gray-700/50">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-5">University Settings</h3>
            <div className="space-y-4">
              <div><label className="text-xs font-bold text-gray-400 uppercase block mb-1">University Name</label><input value={uniName} onChange={e=>setUniName(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm outline-none"/></div>
              <div><label className="text-xs font-bold text-gray-400 uppercase block mb-1">Switch University</label><select value={selectedUni} onChange={e=>setSelectedUni(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm outline-none"><option value="">Select university...</option>{universities.map(u=>(<option key={u.id} value={u.name}>{u.name}</option>))}</select></div>
              <button onClick={() => { if (selectedUni) setUniName(selectedUni); }} className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition">Save Settings</button>
            </div>
          </div>
        </div>}

      </main>
    </div>
  )
}
