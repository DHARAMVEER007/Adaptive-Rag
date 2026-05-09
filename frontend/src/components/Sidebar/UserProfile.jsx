import { useState, useRef, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronUp, LogOut, Settings, User } from 'lucide-react'
import Tooltip from '../Tooltip'

const MenuItem = ({ icon: Icon, label, danger, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2.5 w-full px-3 py-2.5 text-[13px] rounded-lg
                transition-colors duration-100
                ${danger
                  ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-500/[0.08]'
                  : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/[0.06]'
                }`}
  >
    <Icon className="w-4 h-4 flex-shrink-0" />
    {label}
  </button>
)

export default function UserProfile({ isCollapsed, username, role, onLogout }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const ref = useRef(null)
  const initial = (username?.[0] ?? 'U').toUpperCase()

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div
      ref={ref}
      className="flex-shrink-0 border-t border-gray-200/80 dark:border-white/[0.08] p-2"
    >
      <AnimatePresence>
        {menuOpen && !isCollapsed && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="mb-1.5 bg-white dark:bg-[#2a2a2a] rounded-xl shadow-lg
                       border border-gray-200 dark:border-white/[0.1] overflow-hidden p-1"
          >
            <MenuItem icon={Settings} label="Settings" onClick={() => setMenuOpen(false)} />
            <MenuItem icon={User} label="Profile" onClick={() => setMenuOpen(false)} />
            <div className="h-px bg-gray-100 dark:bg-white/[0.08] mx-1 my-1" />
            <MenuItem
              icon={LogOut}
              label="Log out"
              danger
              onClick={() => { setMenuOpen(false); onLogout?.() }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <Tooltip label={`${username} · ${role}`} show={isCollapsed}>
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className={`flex items-center gap-2.5 w-full rounded-xl p-2
                      hover:bg-black/[0.05] dark:hover:bg-white/[0.07]
                      transition-colors duration-150
                      ${isCollapsed ? 'justify-center' : ''}`}
          aria-label="User menu"
          aria-expanded={menuOpen}
        >
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600
                            flex items-center justify-center text-white text-[13px] font-semibold select-none">
              {initial}
            </div>
            <span className="absolute -bottom-[1px] -right-[1px] w-2.5 h-2.5 bg-emerald-500
                             rounded-full border-[2px] border-[#f9f9f9] dark:border-[#171717]" />
          </div>

          {/* Name + role */}
          <AnimatePresence initial={false}>
            {!isCollapsed && (
              <motion.div
                key="info"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="flex-1 min-w-0 text-left"
              >
                <p className="text-[13px] font-medium text-gray-900 dark:text-white
                               truncate leading-[1.3]">
                  {username}
                </p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate leading-[1.3]">
                  {role}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Chevron */}
          <AnimatePresence initial={false}>
            {!isCollapsed && (
              <motion.div
                key="chevron"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="flex-shrink-0"
              >
                <motion.div
                  animate={{ rotate: menuOpen ? 180 : 0 }}
                  transition={{ duration: 0.2, ease: 'easeInOut' }}
                >
                  <ChevronUp className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </button>
      </Tooltip>
    </div>
  )
}
