import { useState, useRef, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Bot, FileText, Loader2, Menu, Send } from 'lucide-react'
import { rag } from '../api/client'

// ── Sub-components ────────────────────────────────────────────────────────────

const Avatar = ({ isUser, initial }) =>
  isUser ? (
    <div className="w-7 h-7 rounded-full flex-shrink-0 mt-0.5 select-none
                    bg-gradient-to-br from-violet-500 to-purple-600
                    flex items-center justify-center text-white text-[11px] font-semibold">
      {initial}
    </div>
  ) : (
    <div className="w-7 h-7 rounded-full flex-shrink-0 mt-0.5
                    bg-gray-900 dark:bg-white flex items-center justify-center">
      <Bot className="w-3.5 h-3.5 text-white dark:text-gray-900" />
    </div>
  )

const Message = ({ role, content, userInitial }) => {
  const isUser = role === 'user'
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
    >
      <Avatar isUser={isUser} initial={userInitial} />
      <div
        className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-[14px] leading-relaxed whitespace-pre-wrap
                    ${isUser
                      ? 'bg-gray-100 dark:bg-white/[0.08] text-gray-900 dark:text-white rounded-tr-sm'
                      : 'bg-white dark:bg-white/[0.04] text-gray-800 dark:text-gray-100 border border-gray-200 dark:border-white/[0.08] rounded-tl-sm shadow-sm'
                    }`}
      >
        {content}
      </div>
    </motion.div>
  )
}

const ThinkingBubble = () => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0 }}
    className="flex gap-3"
  >
    <div className="w-7 h-7 rounded-full flex-shrink-0 mt-0.5
                    bg-gray-900 dark:bg-white flex items-center justify-center">
      <Bot className="w-3.5 h-3.5 text-white dark:text-gray-900" />
    </div>
    <div className="bg-white dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08]
                    rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
      <div className="flex gap-1 items-center h-5">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.15 }}
            className="block w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500"
          />
        ))}
      </div>
    </div>
  </motion.div>
)

// Document chip shown at the very top of the message list
const DocChip = ({ name }) => (
  <motion.div
    initial={{ opacity: 0, y: -6 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.25 }}
    className="flex justify-center mb-2"
  >
    <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl
                    bg-violet-50 dark:bg-violet-500/[0.1]
                    border border-violet-200 dark:border-violet-500/30
                    shadow-sm max-w-xs">
      <div className="w-8 h-8 rounded-xl bg-violet-100 dark:bg-violet-500/20
                      flex items-center justify-center flex-shrink-0">
        <FileText className="w-4 h-4 text-violet-600 dark:text-violet-400" />
      </div>
      <div className="min-w-0">
        <p className="text-[10.5px] font-semibold text-violet-500 dark:text-violet-400
                      uppercase tracking-wider leading-none mb-0.5">
          Attached document
        </p>
        <p className="text-[13px] font-medium text-violet-900 dark:text-violet-200 truncate">
          {name}
        </p>
      </div>
    </div>
  </motion.div>
)

// Welcome screen — different copy for doc chats vs general chats
const WelcomeScreen = ({ docName }) => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5 text-center">
    {docName ? (
      <>
        <div className="flex items-center gap-3 px-5 py-4 rounded-2xl
                        bg-violet-50 dark:bg-violet-500/[0.1]
                        border border-violet-200 dark:border-violet-500/30 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-500/20
                          flex items-center justify-center flex-shrink-0">
            <FileText className="w-5 h-5 text-violet-600 dark:text-violet-400" />
          </div>
          <div className="text-left min-w-0">
            <p className="text-[10.5px] font-semibold text-violet-500 dark:text-violet-400
                          uppercase tracking-wider mb-0.5">
              Attached document
            </p>
            <p className="text-[14px] font-semibold text-violet-900 dark:text-violet-200 truncate
                          max-w-[220px]">
              {docName}
            </p>
          </div>
        </div>
        <div>
          <h1 className="text-[20px] font-semibold text-gray-900 dark:text-white mb-1.5
                         tracking-tight">
            Document ready
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
            Ask me anything about <span className="font-medium text-gray-700 dark:text-gray-300">{docName}</span>
          </p>
        </div>
      </>
    ) : (
      <>
        <div className="w-14 h-14 rounded-2xl bg-gray-900 dark:bg-white
                        flex items-center justify-center shadow-lg">
          <Bot className="w-7 h-7 text-white dark:text-gray-900" />
        </div>
        <div>
          <h1 className="text-[22px] font-semibold text-gray-900 dark:text-white mb-1 tracking-tight">
            LangGraph Assistant
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">How can I help you today?</p>
        </div>
      </>
    )}
  </div>
)

// ── Main component ────────────────────────────────────────────────────────────

export default function ChatArea({ activeSid, username, docName, onToggleSidebar, onFirstMessage }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const [fetching, setFetching] = useState(false)
  const bottomRef = useRef(null)
  const textareaRef = useRef(null)
  const userInitial = (username?.[0] ?? 'U').toUpperCase()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, thinking])

  useEffect(() => {
    if (!activeSid) { setMessages([]); return }
    setFetching(true)
    setMessages([])
    rag
      .getHistory(activeSid)
      .then((history) =>
        setMessages(
          history.map((m, i) => ({
            id: i,
            role: m.role === 'human' ? 'user' : 'assistant',
            content: m.content,
          })),
        ),
      )
      .catch(() => setMessages([]))
      .finally(() => setFetching(false))
  }, [activeSid])

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || thinking || !activeSid) return

    const isFirst = messages.length === 0
    setMessages((prev) => [...prev, { id: Date.now(), role: 'user', content: text }])
    setInput('')
    setThinking(true)
    if (isFirst) onFirstMessage?.(activeSid, text)

    try {
      const reply = await rag.query(text, activeSid)
      setMessages((prev) => [...prev, { id: Date.now() + 1, role: 'assistant', content: reply }])
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, role: 'assistant', content: `Error: ${err.message}` },
      ])
    } finally {
      setThinking(false)
    }
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  return (
    <div className="flex flex-col flex-1 h-screen min-w-0 bg-white dark:bg-[#212121]">
      {/* Header */}
      <header className="flex items-center gap-3 h-14 px-4 flex-shrink-0
                         border-b border-gray-200/80 dark:border-white/[0.08]">
        <button
          onClick={onToggleSidebar}
          className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg
                     text-gray-500 hover:bg-gray-100 dark:hover:bg-white/[0.08] transition-colors"
          aria-label="Toggle sidebar"
        >
          <Menu className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 min-w-0 flex-1">
          {docName ? (
            <>
              <div className="w-6 h-6 rounded-lg bg-violet-100 dark:bg-violet-500/20
                              flex items-center justify-center flex-shrink-0">
                <FileText className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
              </div>
              <span className="text-[13.5px] font-medium text-gray-800 dark:text-gray-200 truncate">
                {docName}
              </span>
            </>
          ) : (
            <>
              <Bot className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
              <span className="text-[13.5px] font-medium text-gray-800 dark:text-gray-200 truncate">
                LangGraph Assistant
              </span>
            </>
          )}
        </div>
      </header>

      {/* Message list */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-6">
        <div className="max-w-2xl mx-auto">
          {fetching ? (
            <div className="flex items-center justify-center min-h-[60vh]">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : messages.length === 0 ? (
            <WelcomeScreen docName={docName} />
          ) : (
            <div className="space-y-5">
              {/* Doc chip pinned at the top when chat has a document */}
              {docName && <DocChip name={docName} />}
              {messages.map((m) => (
                <Message
                  key={m.id}
                  role={m.role}
                  content={m.content}
                  userInitial={userInitial}
                />
              ))}
            </div>
          )}

          <div className="mt-5 space-y-5">
            <AnimatePresence>{thinking && <ThinkingBubble key="thinking" />}</AnimatePresence>
          </div>
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input bar */}
      <div className="flex-shrink-0 px-4 py-4
                      border-t border-gray-200/60 dark:border-white/[0.06]">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-end gap-2 rounded-2xl
                          border border-gray-300 dark:border-white/[0.15]
                          bg-white dark:bg-white/[0.04] px-4 py-3 shadow-sm
                          focus-within:border-gray-400 dark:focus-within:border-white/[0.3]
                          focus-within:ring-2 focus-within:ring-gray-100 dark:focus-within:ring-white/[0.05]
                          transition-all duration-150">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={
                docName
                  ? `Ask about ${docName}…`
                  : activeSid
                    ? 'Message LangGraph Assistant…'
                    : 'Select or start a chat'
              }
              rows={1}
              disabled={!activeSid || thinking}
              className="flex-1 text-[14px] text-gray-900 dark:text-white
                         placeholder-gray-400 dark:placeholder-gray-500
                         resize-none outline-none bg-transparent
                         min-h-[24px] max-h-40 leading-6 scrollbar-none
                         disabled:opacity-50"
              style={{ overflowY: 'auto' }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || thinking || !activeSid}
              className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center
                         bg-gray-900 dark:bg-white text-white dark:text-gray-900
                         hover:bg-gray-700 dark:hover:bg-gray-200
                         disabled:opacity-30 disabled:cursor-not-allowed
                         transition-all duration-150"
              aria-label="Send"
            >
              {thinking
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Send className="w-3.5 h-3.5" />
              }
            </button>
          </div>
          <p className="text-center text-[11px] text-gray-400 dark:text-gray-600 mt-2">
            {docName
              ? `Responses are based on ${docName}`
              : 'LangGraph Assistant may produce inaccurate information.'
            }
          </p>
        </div>
      </div>
    </div>
  )
}
