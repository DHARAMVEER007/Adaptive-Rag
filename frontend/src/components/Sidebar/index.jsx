import { AnimatePresence, motion } from 'framer-motion'
import SidebarHeader from './SidebarHeader'
import NewChatButton from './NewChatButton'
import UploadButton from './UploadButton'
import ChatHistory from './ChatHistory'
import UserProfile from './UserProfile'

const EXPANDED_W = 260
const COLLAPSED_W = 56

export default function Sidebar({
  isCollapsed,
  isMobile,
  onToggle,
  chats,
  activeChat,
  username,
  role,
  onNewChat,
  onSelectChat,
  onDeleteChat,
  onUpload,
  onLogout,
}) {
  return (
    <>
      {/* Mobile backdrop */}
      <AnimatePresence>
        {isMobile && !isCollapsed && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/25 z-10 md:hidden"
            onClick={onToggle}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={false}
        animate={{ width: isCollapsed ? COLLAPSED_W : EXPANDED_W }}
        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
        className="relative flex flex-col h-screen flex-shrink-0 overflow-hidden z-20
                   bg-[#f9f9f9] dark:bg-[#171717]
                   border-r border-gray-200/80 dark:border-white/[0.08]"
        aria-label="Sidebar"
      >
        <SidebarHeader isCollapsed={isCollapsed} onToggle={onToggle} />

        <div className="flex flex-col flex-1 overflow-hidden px-2 gap-1 min-h-0">
          <NewChatButton isCollapsed={isCollapsed} onClick={onNewChat} />
          <UploadButton isCollapsed={isCollapsed} onClick={onUpload} />
          <ChatHistory
            chats={chats}
            activeChat={activeChat}
            isCollapsed={isCollapsed}
            onSelectChat={onSelectChat}
            onDeleteChat={onDeleteChat}
          />
        </div>

        <UserProfile
          isCollapsed={isCollapsed}
          username={username}
          role={role}
          onLogout={onLogout}
        />
      </motion.aside>
    </>
  )
}
