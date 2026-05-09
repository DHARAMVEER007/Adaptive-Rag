import { AnimatePresence, motion } from 'framer-motion'
import { SquarePen } from 'lucide-react'
import Tooltip from '../Tooltip'

const NewChatButton = ({ isCollapsed, onClick }) => (
  <Tooltip label="New Chat" show={isCollapsed}>
    <button
      onClick={onClick}
      className={`flex items-center gap-2.5 w-full rounded-xl px-3 py-2.5
                  text-[13.5px] font-medium text-gray-700
                  bg-black/[0.04] border border-black/[0.06]
                  hover:bg-black/[0.08] active:bg-black/[0.12]
                  dark:bg-white/[0.05] dark:border-white/[0.08] dark:text-gray-200
                  dark:hover:bg-white/[0.1]
                  transition-colors duration-150
                  ${isCollapsed ? 'justify-center !px-2' : ''}`}
      aria-label="New Chat"
    >
      <SquarePen className="w-4 h-4 flex-shrink-0" />
      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.span
            key="label"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="whitespace-nowrap leading-none"
          >
            New Chat
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  </Tooltip>
)

export default NewChatButton
