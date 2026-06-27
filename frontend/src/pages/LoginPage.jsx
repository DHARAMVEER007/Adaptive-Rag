import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Bot, Eye, EyeOff, Loader2 } from 'lucide-react'
import { auth } from '../api/client'

const Field = ({ label, type, value, onChange, placeholder, disabled }) => {
  const [show, setShow] = useState(false)
  const isPassword = type === 'password'
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[13px] font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
      <div className="relative">
        <input
          type={isPassword && show ? 'text' : type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete={isPassword ? 'current-password' : 'username'}
          className="w-full px-3.5 py-2.5 text-sm rounded-xl
                     border border-gray-300 dark:border-white/[0.15]
                     bg-white dark:bg-white/[0.04]
                     text-gray-900 dark:text-white
                     placeholder-gray-400 dark:placeholder-gray-500
                     focus:border-gray-500 dark:focus:border-white/[0.4]
                     focus:outline-none focus:ring-2 focus:ring-gray-100 dark:focus:ring-white/[0.06]
                     disabled:opacity-50 transition-all duration-150"
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2
                       text-gray-400 hover:text-gray-600 dark:hover:text-gray-300
                       transition-colors"
            tabIndex={-1}
          >
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
    </div>
  )
}

export default function LoginPage({ onLogin }) {
  const [tab, setTab] = useState('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState('idle') // idle | loading | error | success
  const [message, setMessage] = useState('')

  const switchTab = (t) => {
    setTab(t)
    setMessage('')
    setStatus('idle')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!username.trim() || !password.trim()) {
      setStatus('error')
      setMessage('Username and password are required.')
      return
    }
    setStatus('loading')
    setMessage('')
    try {
      if (tab === 'login') {
        const res = await auth.login(username.trim(), password)
        onLogin({ username: username.trim(), role: res.role ?? 'user' })
      } else {
        await auth.register(username.trim(), password)
        setStatus('success')
        setMessage('Account created! You can now sign in.')
        setTab('login')
        setPassword('')
      }
    } catch (err) {
      setStatus('error')
      setMessage(err.message)
    }
  }

  const loading = status === 'loading'

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#171717] flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="w-full max-w-sm"
      >
        {/* Logo */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gray-900 dark:bg-white flex items-center
                          justify-center shadow-lg">
            <Bot className="w-6 h-6 text-white dark:text-gray-900" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white tracking-tight">
              LangGraph Assistant
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Your adaptive RAG AI assistant
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-[#212121] rounded-2xl shadow-sm
                        border border-gray-200 dark:border-white/[0.08] overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-gray-100 dark:border-white/[0.08]">
            {[
              { key: 'login', label: 'Sign in' },
              { key: 'register', label: 'Create account' },
            ].map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => switchTab(key)}
                className={`flex-1 py-3.5 text-[13.5px] font-medium transition-colors duration-150
                            ${tab === key
                              ? 'text-gray-900 dark:text-white border-b-2 border-gray-900 dark:border-white -mb-px'
                              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                            }`}
              >
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
            <Field
              label="Username"
              type="text"
              value={username}
              onChange={setUsername}
              placeholder="Enter your username"
              disabled={loading}
            />
            <Field
              label="Password"
              type="password"
              value={password}
              onChange={setPassword}
              placeholder="Enter your password"
              disabled={loading}
            />

            <AnimatePresence mode="wait">
              {message && (
                <motion.p
                  key={status}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`text-[13px] rounded-xl px-3.5 py-2.5 overflow-hidden
                              ${status === 'error'
                                ? 'text-red-600 bg-red-50 dark:bg-red-500/[0.1] dark:text-red-400'
                                : 'text-emerald-700 bg-emerald-50 dark:bg-emerald-500/[0.1] dark:text-emerald-400'
                              }`}
                >
                  {message}
                </motion.p>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 mt-1 rounded-xl
                         bg-gray-900 dark:bg-white
                         text-white dark:text-gray-900
                         text-[13.5px] font-medium
                         hover:bg-gray-700 dark:hover:bg-gray-200
                         disabled:opacity-50 disabled:cursor-not-allowed
                         transition-colors duration-150
                         flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading
                ? 'Please wait…'
                : tab === 'login'
                  ? 'Sign in'
                  : 'Create account'}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  )
}
