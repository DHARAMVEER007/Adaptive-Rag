import { AnimatePresence, motion } from 'framer-motion'
import { Paperclip } from 'lucide-react'
import Tooltip from '../Tooltip'

const UploadButton = ({ isCollapsed, onClick }) => (
  <Tooltip label="Upload Documents" show={isCollapsed}>
    <button
      onClick={onClick}
      className={`flex items-center gap-2.5 w-full rounded-xl px-3 py-2.5
                  text-[13.5px] font-medium text-gray-600
                  hover:bg-black/[0.05] active:bg-black/[0.09]
                  dark:text-gray-400 dark:hover:bg-white/[0.07]
                  transition-colors duration-150
                  ${isCollapsed ? 'justify-center !px-2' : ''}`}
      aria-label="Upload Documents"
    >
      <Paperclip className="w-4 h-4 flex-shrink-0" />
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
            Upload Documents
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  </Tooltip>
)

export default UploadButton
