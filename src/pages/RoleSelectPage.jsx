import { useState } from 'react'

const roles = [
  {
    id: 'candidate',
    icon: '🎯',
    title: 'Candidate',
    subtitle: 'B2C',
    description: 'Practice AI interviews, build your score profile, and get discovered by top employers.',
    gradient: 'from-blue-600 to-cyan-500',
    shadowColor: 'shadow-blue-500/20',
    bgLight: 'bg-blue-50',
    bgDark: 'dark:bg-blue-950/30',
    borderHover: 'hover:border-blue-400',
    features: ['AI Interview Practice', 'Score Badges', 'Profile Visibility'],
  },
  {
    id: 'employer',
    icon: '🏢',
    title: 'Employer',
    subtitle: 'B2B',
    description: 'Search and filter top talent by AI scores, skills, and university backgrounds.',
    gradient: 'from-purple-600 to-pink-500',
    shadowColor: 'shadow-purple-500/20',
    bgLight: 'bg-purple-50',
    bgDark: 'dark:bg-purple-950/30',
    borderHover: 'hover:border-purple-400',
    features: ['Talent Search', 'AI Score Filtering', 'Direct Messaging'],
  },
  {
    id: 'university',
    icon: '🏛️',
    title: 'University Admin',
    subtitle: 'B2B Enterprise',
    description: 'Monitor student performance with analytics dashboards and department breakdowns.',
    gradient: 'from-emerald-600 to-teal-500',
    shadowColor: 'shadow-emerald-500/20',
    bgLight: 'bg-emerald-50',
    bgDark: 'dark:bg-emerald-950/30',
    borderHover: 'hover:border-emerald-400',
    features: ['Analytics Dashboard', 'Department Insights', 'Top Students'],
  },
  {
    id: 'admin',
    icon: '🛡️',
    title: 'Super Admin',
    subtitle: 'Admin',
    description: 'Manage all users, universities, accounts, and platform settings.',
    gradient: 'from-red-600 to-orange-500',
    shadowColor: 'shadow-red-500/20',
    bgLight: 'bg-red-50',
    bgDark: 'dark:bg-red-950/30',
    borderHover: 'hover:border-red-400',
    features: ['User Management', 'University CRUD', 'Platform Settings'],
  },
]

export default function RoleSelectPage({ onSelectRole }) {
  const [hoveredRole, setHoveredRole] = useState(null)

  return (
    <section className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden bg-gray-50 dark:bg-gray-950 transition-colors duration-500">
      {/* Animated background orbs */}
      <div className="absolute top-[-15%] left-[-10%] w-[40rem] h-[40rem] bg-blue-400/10 rounded-full blur-3xl pointer-events-none animate-pulse" style={{ animationDuration: '8s' }} />
      <div className="absolute bottom-[-15%] right-[-10%] w-[40rem] h-[40rem] bg-purple-400/10 rounded-full blur-3xl pointer-events-none animate-pulse" style={{ animationDuration: '6s' }} />
      <div className="absolute top-[30%] right-[20%] w-[25rem] h-[25rem] bg-emerald-400/10 rounded-full blur-3xl pointer-events-none animate-pulse" style={{ animationDuration: '10s' }} />

      <div className="max-w-6xl w-full z-10">
        <div className="text-center mb-16 animate-fade-in-up">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-300 mb-6 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            AI Interview Platform
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-gray-900 dark:text-white mb-5 tracking-tight leading-tight">
            Welcome to{' '}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-purple-600 to-emerald-600">
              AI Interview
            </span>
          </h1>
          <p className="text-lg md:text-xl text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
            Select your role to continue. Your experience will be tailored to your needs.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6">
          {roles.map((role, index) => (
            <button
              key={role.id}
              onClick={() => onSelectRole(role.id)}
              onMouseEnter={() => setHoveredRole(role.id)}
              onMouseLeave={() => setHoveredRole(null)}
              className={`group relative text-left rounded-[2rem] p-8 lg:p-10 transition-all duration-500 border-2 backdrop-blur-xl
                bg-white/90 dark:bg-gray-900/90 border-gray-200 dark:border-gray-800
                ${role.borderHover} dark:${role.borderHover}
                ${hoveredRole === role.id ? `shadow-2xl ${role.shadowColor} -translate-y-2 border-opacity-100` : 'shadow-lg hover:-translate-y-1'}
              `}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Glow effect on hover */}
              <div className={`absolute inset-0 rounded-[2rem] bg-gradient-to-br ${role.gradient} opacity-0 group-hover:opacity-[0.03] transition-opacity duration-500 pointer-events-none`} />

              {/* Icon */}
              <div className={`w-16 h-16 rounded-2xl ${role.bgLight} ${role.bgDark} flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform duration-300`}>
                {role.icon}
              </div>

              {/* Title & Subtitle */}
              <div className="flex items-center gap-3 mb-3">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {role.title}
                </h2>
                <span className={`px-2.5 py-0.5 text-xs font-bold rounded-lg bg-gradient-to-r ${role.gradient} text-white`}>
                  {role.subtitle}
                </span>
              </div>

              <p className="text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
                {role.description}
              </p>

              {/* Feature Pills */}
              <div className="flex flex-wrap gap-2">
                {role.features.map((feature) => (
                  <span
                    key={feature}
                    className="px-3 py-1 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700"
                  >
                    {feature}
                  </span>
                ))}
              </div>

              {/* Arrow indicator */}
              <div className="absolute top-8 right-8 w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 dark:text-gray-500 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
