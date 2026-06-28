import { useState, useEffect, useCallback } from 'react'
import { AnimatePresence } from 'framer-motion'
import Sidebar from './components/Sidebar'
import ChatArea from './components/ChatArea'
import LoginPage from './pages/LoginPage'
import UploadModal from './components/UploadModal'
import { rag, auth } from './api/client'

const LS_KEY = 'lg_user'
const LS_DOC_KEY = 'lg_doc_sessions' // { [sessionId]: filename }

function sessionToChat(s) {
  return {
    id: s.session_id,
    title: s.title || 'New Conversation',
    timestamp: new Date(s.last_updated || s.created_at || Date.now()),
  }
}

function readDocSessions() {
  try { return JSON.parse(localStorage.getItem(LS_DOC_KEY) || '{}') } catch { return {} }
}

export default function App() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY)) } catch { return null }
  })
  const [chats, setChats] = useState([])
  const [activeChatId, setActiveChatId] = useState(null)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  // Maps sessionId → original filename for doc-based chats
  const [docSessions, setDocSessions] = useState(readDocSessions)

  // Persist docSessions to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(LS_DOC_KEY, JSON.stringify(docSessions))
  }, [docSessions])

  // Mobile detection
  useEffect(() => {
    const sync = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      if (mobile) setIsCollapsed(true)
    }
    sync()
    window.addEventListener('resize', sync)
    return () => window.removeEventListener('resize', sync)
  }, [])

  // Load real sessions from backend
  const loadSessions = useCallback(async () => {
    if (!user) return
    try {
      const sessions = await rag.getSessions()
      const mapped = sessions
        .map(sessionToChat)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      // Start each login on a fresh chat rather than reopening the last one.
      // Past chats remain listed below in the sidebar.
      const sid = `${user.username}_${Date.now()}`
      const freshChat = { id: sid, title: 'New Conversation', timestamp: new Date() }
      setChats([freshChat, ...mapped])
      setActiveChatId(sid)
    } catch (e) {
      console.error('Could not load sessions:', e.message)
    }
  }, [user])

  useEffect(() => { loadSessions() }, [loadSessions])

  const handleLogin = (userData) => {
    localStorage.setItem(LS_KEY, JSON.stringify(userData))
    setUser(userData)
  }

  const handleLogout = () => {
    auth.logout()
    localStorage.removeItem(LS_KEY)
    setUser(null)
    setChats([])
    setActiveChatId(null)
  }

  const handleNewChat = () => {
    const sid = `${user.username}_${Date.now()}`
    const chat = { id: sid, title: 'New Conversation', timestamp: new Date() }
    setChats((prev) => [chat, ...prev])
    setActiveChatId(sid)
    if (isMobile) setIsCollapsed(true)
  }

  const handleSelectChat = (id) => {
    setActiveChatId(id)
    if (isMobile) setIsCollapsed(true)
  }

  const handleDeleteChat = (id) => {
    setChats((prev) => {
      const next = prev.filter((c) => c.id !== id)
      if (activeChatId === id) setActiveChatId(next[0]?.id ?? null)
      return next
    })
  }

  const handleFirstMessage = useCallback((sid, text) => {
    const title = text.length > 60 ? text.slice(0, 60) + '…' : text
    setChats((prev) => prev.map((c) => (c.id === sid ? { ...c, title } : c)))
  }, [])

  if (!user) return <LoginPage onLogin={handleLogin} />

  return (
    <div className="flex h-screen overflow-hidden bg-white dark:bg-[#212121]">
      <AnimatePresence>
        {showUpload && (
          <UploadModal
            key="upload"
            username={user.username}
            onClose={() => setShowUpload(false)}
            onUploaded={({ sessionId, filename }) => {
              const title = filename.replace(/\.[^.]+$/, '')
              const chat = { id: sessionId, title, timestamp: new Date() }
              setChats((prev) => [chat, ...prev])
              setActiveChatId(sessionId)
              // Remember the original filename for this session
              setDocSessions((prev) => ({ ...prev, [sessionId]: filename }))
              setShowUpload(false)
            }}
          />
        )}
      </AnimatePresence>

      <Sidebar
        isCollapsed={isCollapsed}
        isMobile={isMobile}
        onToggle={() => setIsCollapsed((v) => !v)}
        chats={chats}
        activeChat={activeChatId}
        username={user.username}
        role={user.role}
        onNewChat={handleNewChat}
        onSelectChat={handleSelectChat}
        onDeleteChat={handleDeleteChat}
        onUpload={() => setShowUpload(true)}
        onLogout={handleLogout}
      />

      <ChatArea
        activeSid={activeChatId}
        username={user.username}
        docName={docSessions[activeChatId] ?? null}
        onToggleSidebar={() => setIsCollapsed((v) => !v)}
        onFirstMessage={handleFirstMessage}
      />
    </div>
  )
}
