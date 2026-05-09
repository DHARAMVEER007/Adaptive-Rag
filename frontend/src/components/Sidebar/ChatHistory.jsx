import { AnimatePresence, motion } from 'framer-motion'
import ChatItem from './ChatItem'
import { getGroup, GROUP_LABELS, GROUP_ORDER } from '../../data/chatData'

const GroupLabel = ({ label }) => (
  <div className="px-3 pt-3 pb-1">
    <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider
                     dark:text-gray-500 select-none">
      {label}
    </span>
  </div>
)

const ChatHistory = ({ chats, activeChat, isCollapsed, onSelectChat, onDeleteChat }) => {
  const grouped = GROUP_ORDER.reduce((acc, key) => {
    const items = chats.filter((c) => getGroup(c.timestamp) === key)
    if (items.length) acc[key] = items
    return acc
  }, {})

  if (isCollapsed) {
    return (
      <div className="flex-1 overflow-y-auto scrollbar-none mt-2 flex flex-col gap-0.5 items-center">
        {chats.slice(0, 10).map((chat) => (
          <ChatItem
            key={chat.id}
            chat={chat}
            isActive={activeChat === chat.id}
            isCollapsed
            onSelect={onSelectChat}
            onDelete={onDeleteChat}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin -mx-2 mt-1">
      <div className="px-2 pb-3">
        <div className="px-3 pt-3 pb-1">
          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider
                           dark:text-gray-500 select-none">
            Recents
          </span>
        </div>

        {GROUP_ORDER.map((groupKey) => {
          const items = grouped[groupKey]
          if (!items) return null

          return (
            <div key={groupKey}>
              <GroupLabel label={GROUP_LABELS[groupKey]} />
              <div className="space-y-[2px]">
                <AnimatePresence mode="popLayout" initial={false}>
                  {items.map((chat) => (
                    <motion.div
                      key={chat.id}
                      layout
                      initial={{ opacity: 0, y: -6, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: 'auto' }}
                      exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                    >
                      <ChatItem
                        chat={chat}
                        isActive={activeChat === chat.id}
                        isCollapsed={false}
                        onSelect={onSelectChat}
                        onDelete={onDeleteChat}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default ChatHistory
