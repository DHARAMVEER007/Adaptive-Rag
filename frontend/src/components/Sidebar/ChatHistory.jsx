import { useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import ChatItem from './ChatItem'
import { getGroup, getGroupLabel, sortGroupKeys } from '../../data/chatData'

const GroupLabel = ({ label }) => (
  <div className="px-3 pt-3 pb-1">
    <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider
                     dark:text-gray-500 select-none">
      {label}
    </span>
  </div>
)

const ChatHistory = ({ chats, activeChat, isCollapsed, onSelectChat, onDeleteChat }) => {
  const { groupMap, groupKeys } = useMemo(() => {
    const map = {}
    chats.forEach((c) => {
      const key = getGroup(c.timestamp)
      if (!map[key]) map[key] = []
      map[key].push(c)
    })
    // Sort items within each group newest first
    Object.values(map).forEach((items) =>
      items.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    )
    return { groupMap: map, groupKeys: sortGroupKeys(Object.keys(map)) }
  }, [chats])

  // Collapsed: show recent chats sorted newest first
  const sortedAll = useMemo(
    () => [...chats].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)),
    [chats]
  )

  if (isCollapsed) {
    return (
      <div className="flex-1 overflow-y-auto scrollbar-none mt-2 flex flex-col gap-0.5 items-center">
        {sortedAll.slice(0, 10).map((chat) => (
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

        {groupKeys.map((groupKey) => {
          const items = groupMap[groupKey]
          if (!items) return null
          return (
            <div key={groupKey}>
              <GroupLabel label={getGroupLabel(groupKey)} />
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
