import { motion } from 'framer-motion';

/**
 * Glassmorphism card — backdrop blur, translucent bg, optional glow.
 */
export default function GlassCard({
  children,
  className = '',
  glow = false,
  glowColor = 'rgba(99, 102, 241, 0.25)',
  delay = 0,
  hover = true,
  onClick,
  style,
  ...props
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay, ease: [0.16, 1, 0.3, 1] }}
      whileHover={hover ? { scale: 1.015, transition: { duration: 0.18 } } : undefined}
      onClick={onClick}
      className={`relative rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] shadow-[0_8px_32px_0_rgba(0,0,0,0.45)] overflow-hidden ${onClick ? 'cursor-pointer' : ''} ${className}`}
      style={{
        ...(glow
          ? { boxShadow: `0 8px 32px rgba(0,0,0,0.45), 0 0 60px ${glowColor}` }
          : {}),
        ...style,
      }}
      {...props}
    >
      {/* Subtle inner gradient shimmer */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.04] to-transparent pointer-events-none" />
      {children}
    </motion.div>
  );
}
