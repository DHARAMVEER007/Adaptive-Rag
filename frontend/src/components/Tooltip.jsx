import { useState, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'

const Tooltip = ({ children, label, show = true }) => {
  const [visible, setVisible] = useState(false)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const ref = useRef(null)

  const handleEnter = useCallback(() => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect()
      setPos({ x: rect.right + 10, y: rect.top + rect.height / 2 })
    }
    setVisible(true)
  }, [])

  const handleLeave = useCallback(() => setVisible(false), [])

  if (!show) return <>{children}</>

  return (
    <>
      <div ref={ref} onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
        {children}
      </div>
      {createPortal(
        <AnimatePresence>
          {visible && (
            <motion.div
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -6 }}
              transition={{ duration: 0.13, ease: 'easeOut' }}
              style={{
                position: 'fixed',
                left: pos.x,
                top: pos.y,
                transform: 'translateY(-50%)',
                zIndex: 9999,
                pointerEvents: 'none',
              }}
              className="px-2.5 py-1.5 text-xs font-medium bg-gray-900 text-white rounded-lg
                         whitespace-nowrap shadow-xl dark:bg-gray-100 dark:text-gray-900"
            >
              {label}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  )
}

export default Tooltip
