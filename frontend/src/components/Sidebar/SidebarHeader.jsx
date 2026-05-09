import { AnimatePresence, motion } from 'framer-motion'
import { Bot, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import Tooltip from '../Tooltip'

const SidebarHeader = ({ isCollapsed, onToggle }) => (
  <div
    className={`flex items-center h-14 px-2 flex-shrink-0 ${
      isCollapsed ? 'justify-center' : 'justify-between'
    }`}
  >
    <AnimatePresence initial={false}>
      {!isCollapsed && (
        <motion.div
          key="logo"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="flex items-center gap-2.5 pl-1 overflow-hidden"
        >
          <div className="w-7 h-7 rounded-lg bg-gray-900 flex items-center justify-center flex-shrink-0
                          dark:bg-white">
            <Bot className="w-4 h-4 text-white dark:text-gray-900" />
          </div>
          <span className="font-semibold text-[13.5px] text-gray-900 whitespace-nowrap tracking-[-0.01em]
                           dark:text-white">
            LangGraph Assistant
          </span>
        </motion.div>
      )}
    </AnimatePresence>

    <Tooltip label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} show={isCollapsed}>
      <button
        onClick={onToggle}
        className="w-8 h-8 flex items-center justify-center rounded-lg flex-shrink-0
                   text-gray-500 hover:bg-black/[0.06] hover:text-gray-800
                   dark:text-gray-400 dark:hover:bg-white/[0.08] dark:hover:text-white
                   transition-colors duration-150"
        aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {isCollapsed ? (
          <PanelLeftOpen className="w-[17px] h-[17px]" />
        ) : (
          <PanelLeftClose className="w-[17px] h-[17px]" />
        )}
      </button>
    </Tooltip>
  </div>
)

export default SidebarHeader
