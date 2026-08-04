import { motion } from 'framer-motion'

export function PageTransition({ children, className = '' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -12, scale: 0.985 }}
      transition={{ duration: 0.24, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
