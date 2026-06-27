import { useState, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, FileText, Loader2, Paperclip, Upload, X } from 'lucide-react'
import { rag } from '../api/client'

export default function UploadModal({ username, onClose, onUploaded }) {
  const [file, setFile] = useState(null)
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState('idle') // idle | uploading | done | error
  const [errorMsg, setErrorMsg] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef(null)

  const setPickedFile = (f) => {
    if (!f) return
    if (!['application/pdf', 'text/plain'].includes(f.type) && !f.name.match(/\.(pdf|txt)$/i)) {
      setStatus('error')
      setErrorMsg('Only PDF and TXT files are supported.')
      return
    }
    setFile(f)
    setStatus('idle')
    setErrorMsg('')
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    setPickedFile(e.dataTransfer.files[0])
  }

  const handleUpload = async () => {
    if (!file || !description.trim()) return
    setStatus('uploading')
    setErrorMsg('')

    // Generate a stable session_id for this upload
    const sessionId = `${username}_${Date.now()}`

    try {
      const result = await rag.uploadDocument(file, description.trim(), sessionId)
      setStatus('done')
      // Brief success flash, then hand control back to parent
      setTimeout(() => {
        onUploaded({ sessionId: result.session_id, filename: file.name })
        onClose()
      }, 900)
    } catch (err) {
      setStatus('error')
      setErrorMsg(err.message)
    }
  }

  const canUpload = file && description.trim() && status !== 'uploading' && status !== 'done'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 10 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="bg-white dark:bg-[#212121] rounded-2xl shadow-2xl
                   border border-gray-200 dark:border-white/[0.1]
                   w-full max-w-[420px] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4
                        border-b border-gray-100 dark:border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <Paperclip className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <h2 className="text-[14.5px] font-semibold text-gray-900 dark:text-white">
              Upload Document
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg
                       text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.08]
                       hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          {/* Drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onClick={() => inputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center
                        gap-2.5 cursor-pointer transition-all duration-150 select-none
                        ${file
                          ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-500/40 dark:bg-emerald-500/[0.06]'
                          : dragOver
                            ? 'border-gray-400 bg-gray-100 dark:border-white/30 dark:bg-white/[0.06]'
                            : 'border-gray-200 hover:border-gray-400 hover:bg-gray-50 dark:border-white/[0.12] dark:hover:border-white/30 dark:hover:bg-white/[0.04]'
                        }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.txt"
              onChange={(e) => setPickedFile(e.target.files[0])}
              className="hidden"
            />
            {file ? (
              <>
                <FileText className="w-9 h-9 text-emerald-600 dark:text-emerald-400" />
                <p className="text-[13.5px] font-medium text-emerald-700 dark:text-emerald-300 text-center">
                  {file.name}
                </p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400">
                  {(file.size / 1024).toFixed(1)} KB — click to change
                </p>
              </>
            ) : (
              <>
                <Upload className="w-9 h-9 text-gray-400 dark:text-gray-500" />
                <p className="text-[13.5px] font-medium text-gray-600 dark:text-gray-300">
                  Drop a file or click to browse
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500">PDF or TXT — max 20 MB</p>
              </>
            )}
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-gray-700 dark:text-gray-300">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this document…"
              rows={2}
              className="px-3.5 py-2.5 text-sm rounded-xl resize-none
                         border border-gray-300 dark:border-white/[0.15]
                         bg-white dark:bg-white/[0.04]
                         text-gray-900 dark:text-white
                         placeholder-gray-400 dark:placeholder-gray-500
                         focus:border-gray-500 dark:focus:border-white/[0.4]
                         focus:outline-none focus:ring-2 focus:ring-gray-100 dark:focus:ring-white/[0.06]
                         transition-all duration-150"
            />
          </div>

          {/* Info banner */}
          <div className="flex items-start gap-2 rounded-xl bg-blue-50 dark:bg-blue-500/[0.08]
                          border border-blue-100 dark:border-blue-500/20 px-3.5 py-2.5">
            <span className="text-blue-500 dark:text-blue-400 mt-0.5 flex-shrink-0">ℹ</span>
            <p className="text-[12px] text-blue-700 dark:text-blue-300 leading-relaxed">
              A new chat will open automatically. All messages in that chat will
              answer questions based on this document.
            </p>
          </div>

          {/* Error */}
          <AnimatePresence>
            {status === 'error' && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="text-[13px] text-red-600 dark:text-red-400
                           bg-red-50 dark:bg-red-500/[0.1] rounded-xl px-3.5 py-2.5"
              >
                {errorMsg}
              </motion.p>
            )}
          </AnimatePresence>

          {/* Upload button */}
          <button
            onClick={handleUpload}
            disabled={!canUpload}
            className="w-full py-2.5 rounded-xl
                       bg-gray-900 dark:bg-white
                       text-white dark:text-gray-900
                       text-[13.5px] font-medium
                       hover:bg-gray-700 dark:hover:bg-gray-200
                       disabled:opacity-40 disabled:cursor-not-allowed
                       transition-colors duration-150
                       flex items-center justify-center gap-2"
          >
            {status === 'uploading' && <Loader2 className="w-4 h-4 animate-spin" />}
            {status === 'done' && <CheckCircle2 className="w-4 h-4" />}
            {status === 'idle' && 'Upload & Open New Chat'}
            {status === 'uploading' && 'Uploading…'}
            {status === 'done' && 'Done! Opening chat…'}
            {status === 'error' && 'Retry Upload'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
