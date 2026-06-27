import React, { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDesignSystem } from './DesignSystemContext.js'
import { Loader, X } from 'lucide-react'

/**
 * 1. Button — light premium
 */
export const Button = ({
    children,
    variant = 'primary', // 'primary' | 'secondary' | 'outline' | 'glass' | 'ghost' | 'danger'
    size = 'md', // 'sm' | 'md' | 'lg'
    isLoading = false,
    disabled = false,
    icon: Icon,
    iconPosition = 'left',
    onClick,
    type = 'button',
    className = '',
    ...props
}) => {
    const { prefersReducedMotion } = useDesignSystem()

    const sizeClasses = {
        sm: 'px-4 py-2 text-xs rounded-lg gap-1.5',
        md: 'px-5 py-2.5 text-sm rounded-xl gap-2',
        lg: 'px-7 py-3.5 text-base rounded-2xl gap-3',
    }

    const baseClasses =
        'inline-flex items-center justify-center font-semibold transition-colors duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed outline-none focus-visible:ring-2 focus-visible:ring-brand/40'

    const variantClasses = {
        primary:
            'bg-brand hover:bg-brand-strong text-white shadow-[0_8px_24px_rgba(37,99,235,0.22)] active:bg-brand-strong',
        secondary:
            'bg-accent hover:bg-accent-soft text-white shadow-[0_8px_24px_rgba(124,58,237,0.20)]',
        outline:
            'border border-line bg-white text-ink hover:bg-surface-2 hover:border-brand/40',
        glass: 'glass text-ink hover:bg-white/90',
        ghost: 'bg-transparent text-ink-soft hover:bg-surface-2 hover:text-ink',
        danger: 'bg-danger hover:bg-red-600 text-white shadow-[0_8px_24px_rgba(239,68,68,0.20)]',
    }

    const motionProps = prefersReducedMotion
        ? {}
        : {
              whileHover: { scale: 1.02 },
              whileTap: { scale: 0.98 },
              transition: { duration: 0.1, ease: 'easeInOut' },
          }

    return (
        <motion.button
            type={type}
            onClick={onClick}
            disabled={disabled || isLoading}
            className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant] || variantClasses.primary} ${className}`}
            {...motionProps}
            {...props}
        >
            {isLoading && <Loader className="w-4 h-4 animate-spin text-current" />}
            {!isLoading && Icon && iconPosition === 'left' && <Icon className="w-4 h-4" />}
            {children && <span>{children}</span>}
            {!isLoading && Icon && iconPosition === 'right' && <Icon className="w-4 h-4" />}
        </motion.button>
    )
}

/**
 * 2. Input — light premium
 */
export const Input = ({
    label,
    error,
    type = 'text',
    disabled = false,
    placeholder,
    value,
    onChange,
    icon: Icon,
    className = '',
    ...props
}) => {
    const { prefersReducedMotion } = useDesignSystem()

    const containerVariants = {
        error: prefersReducedMotion ? {} : { x: [0, -4, 4, -4, 4, 0], transition: { duration: 0.4 } },
    }

    return (
        <motion.div
            className="flex flex-col gap-2 w-full"
            animate={error ? 'error' : 'normal'}
            variants={containerVariants}
        >
            {label && (
                <label className="text-xs font-semibold text-ink-soft tracking-wide select-none">
                    {label}
                </label>
            )}
            <div className="relative flex items-center">
                {Icon && (
                    <div className="absolute left-4 pointer-events-none">
                        <Icon className="w-4 h-4 text-ink-faint" />
                    </div>
                )}
                <input
                    type={type}
                    disabled={disabled}
                    placeholder={placeholder}
                    value={value}
                    onChange={onChange}
                    className={`w-full py-2.5 rounded-xl border bg-white text-ink placeholder-ink-faint focus:outline-none focus:ring-2 transition-all duration-200 text-sm
                        ${Icon ? 'pl-11 pr-4' : 'px-4'}
                        ${
                            error
                                ? 'border-danger/50 focus:ring-danger/20 focus:border-danger'
                                : 'border-line focus:ring-brand/20 focus:border-brand/60'
                        }
                        ${disabled ? 'opacity-50 cursor-not-allowed bg-surface-2' : ''}
                        ${className}`}
                    {...props}
                />
            </div>
            {error && (
                <span className="text-xs text-danger font-medium mt-0.5 select-none">{error}</span>
            )}
        </motion.div>
    )
}

/**
 * 3. GlassCard — light premium (white glass + soft shadow)
 */
export const GlassCard = ({
    children,
    hoverEffect = true,
    padding = 'p-6',
    className = '',
    onClick,
    ...props
}) => {
    const { prefersReducedMotion } = useDesignSystem()

    const motionProps =
        hoverEffect && !prefersReducedMotion
            ? {
                  whileHover: { y: -4, boxShadow: '0 12px 40px rgba(16,24,40,0.12)' },
                  transition: { duration: 0.25, ease: 'easeOut' },
              }
            : {}

    return (
        <motion.div
            onClick={onClick}
            className={`glass rounded-2xl ${padding} relative overflow-hidden ${
                onClick ? 'cursor-pointer' : ''
            } ${className}`}
            {...motionProps}
            {...props}
        >
            <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-transparent pointer-events-none" />
            <div className="relative">{children}</div>
        </motion.div>
    )
}

/**
 * 4. Badge — light premium
 */
export const Badge = ({
    children,
    status = 'info', // 'success' | 'warning' | 'danger' | 'info' | 'neutral'
    pulse = false,
    className = '',
}) => {
    const statusClasses = {
        success: 'text-emerald-700 bg-emerald-50 border-emerald-200',
        warning: 'text-amber-700 bg-amber-50 border-amber-200',
        danger: 'text-red-700 bg-red-50 border-red-200',
        info: 'text-blue-700 bg-blue-50 border-blue-200',
        neutral: 'text-slate-600 bg-slate-100 border-slate-200',
    }

    const dotColors = {
        success: 'bg-emerald-500',
        warning: 'bg-amber-500',
        danger: 'bg-red-500',
        info: 'bg-blue-500',
        neutral: 'bg-slate-400',
    }

    return (
        <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border ${statusClasses[status] || statusClasses.info} ${className}`}
        >
            {pulse && (
                <span className="relative flex h-1.5 w-1.5">
                    <span
                        className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${dotColors[status] || dotColors.info}`}
                    />
                    <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${dotColors[status] || dotColors.info}`} />
                </span>
            )}
            {children}
        </span>
    )
}

/**
 * 5. Modal — light premium
 */
export const Modal = ({
    isOpen,
    onClose,
    title,
    children,
    size = 'md', // 'sm' | 'md' | 'lg' | 'xl'
    className = '',
}) => {
    const { prefersReducedMotion } = useDesignSystem()
    const modalRef = useRef(null)

    useEffect(() => {
        document.body.style.overflow = isOpen ? 'hidden' : ''
        return () => {
            document.body.style.overflow = ''
        }
    }, [isOpen])

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isOpen) onClose?.()
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isOpen, onClose])

    const sizeClasses = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl' }

    const contentVariants = prefersReducedMotion
        ? { hidden: { opacity: 0 }, visible: { opacity: 1 } }
        : {
              hidden: { opacity: 0, scale: 0.96, y: 10 },
              visible: { opacity: 1, scale: 1, y: 0 },
          }

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div
                        className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={onClose}
                    />
                    <motion.div
                        ref={modalRef}
                        className={`w-full glass-strong rounded-2xl p-6 relative z-10 overflow-hidden ${sizeClasses[size]} ${className}`}
                        initial="hidden"
                        animate="visible"
                        exit="hidden"
                        variants={contentVariants}
                        transition={{ duration: 0.3, ease: 'easeOut' }}
                    >
                        <div className="flex justify-between items-center mb-6 border-b border-line pb-4">
                            {title && (
                                <h3 className="text-lg font-bold text-ink tracking-tight">{title}</h3>
                            )}
                            <button
                                onClick={onClose}
                                className="text-ink-faint hover:text-ink transition-colors cursor-pointer p-1.5 hover:bg-surface-2 rounded-lg ml-auto"
                                aria-label="Close modal"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="text-ink-soft text-sm overflow-y-auto max-h-[70vh]">
                            {children}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}
