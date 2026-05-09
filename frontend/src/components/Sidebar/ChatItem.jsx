import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { MessageSquare, Trash2 } from 'lucide-react'
import Tooltip from '../Tooltip'

const ChatItem = ({ chat, isActive, isCollapsed, onSelect, onDelete }) => {
  const [hovered, setHovered] = useState(false)

  return (
    <Tooltip label={chat.title} show={isCollapsed}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => onSelect(chat.id)}
        onKeyDown={(e) => e.key === 'Enter' && onSelect(chat.id)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={`relative flex items-center gap-2.5 rounded-lg px-3 py-2 cursor-pointer
                    select-none outline-none focus-visible:ring-2 focus-visible:ring-blue-400
                    transition-colors duration-100 group
                    ${isCollapsed ? '!px-2 justify-center' : ''}
                    ${isActive
                      ? 'bg-black/[0.09] text-gray-900 dark:bg-white/[0.12] dark:text-white'
                      : 'text-gray-700 hover:bg-black/[0.05] dark:text-gray-300 dark:hover:bg-white/[0.06]'
                    }`}
      >
        <MessageSquare
          className={`w-[15px] h-[15px] flex-shrink-0 ${
            isActive ? 'text-gray-700 dark:text-gray-200' : 'text-gray-400 dark:text-gray-500'
          }`}
        />

        {!isCollapsed && (
          <>
            <span className="flex-1 text-[13px] leading-5 truncate min-w-0">
              {chat.title}
            </span>

            <AnimatePresence>
              {(hovered || isActive) && (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.1 }}
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete(chat.id)
                  }}
                  className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-md
                             text-gray-400 hover:text-red-500 hover:bg-red-50
                             dark:hover:bg-red-500/10 dark:hover:text-red-400
                             transition-colors duration-100"
                  aria-label="Delete chat"
                >
                  <Trash2 className="w-3 h-3" />
                </motion.button>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </Tooltip>
  )
}

export default ChatItem
