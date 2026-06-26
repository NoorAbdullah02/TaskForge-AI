import React, { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDesignSystem } from './DesignSystemContext.js'
import { Loader } from 'lucide-react'

/**
 * 1. Button Component
 */
export const Button = ({
    children,
    variant = 'primary', // 'primary' | 'secondary' | 'outline' | 'glass'
    size = 'md', // 'sm' | 'md' | 'lg'
    isLoading = false,
    disabled = false,
    icon: Icon,
    iconPosition = 'left', // 'left' | 'right'
    onClick,
    type = 'button',
    className = '',
    ...props
}) => {
    const { prefersReducedMotion } = useDesignSystem()

    const sizeClasses = {
        sm: 'px-4 py-2 text-xs rounded-lg gap-1.5',
        md: 'px-6 py-3 text-sm rounded-xl gap-2',
        lg: 'px-8 py-4 text-base rounded-2xl gap-3',
    }

    const baseClasses = 'inline-flex items-center justify-center font-semibold transition-colors duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50'

    const variantClasses = {
        primary: 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 active:bg-blue-700',
        secondary: 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/20 active:bg-purple-700',
        outline: 'border border-white/20 bg-transparent text-white hover:bg-white/5 hover:border-white/40',
        glass: 'bg-white/5 border border-white/10 hover:bg-white/10 text-white backdrop-blur-md',
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
            className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
            {...motionProps}
            {...props}
        >
            {isLoading && <Loader className="w-4 h-4 animate-spin text-current" />}
            {!isLoading && Icon && iconPosition === 'left' && <Icon className="w-4 h-4" />}
            <span>{children}</span>
            {!isLoading && Icon && iconPosition === 'right' && <Icon className="w-4 h-4" />}
        </motion.button>
    )
}

/**
 * 2. Input Component
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
        error: prefersReducedMotion
            ? {}
            : {
                  x: [0, -4, 4, -4, 4, 0],
                  transition: { duration: 0.4 },
              },
    }

    return (
        <motion.div
            className="flex flex-col gap-2 w-full"
            animate={error ? 'error' : 'normal'}
            variants={containerVariants}
        >
            {label && (
                <label className="text-xs font-semibold text-gray-400 tracking-wider uppercase select-none">
                    {label}
                </label>
            )}
            <div className="relative flex items-center">
                {Icon && (
                    <div className="absolute left-4 pointer-events-none">
                        <Icon className="w-4 h-4 text-gray-500 transition-colors duration-200" />
                    </div>
                )}
                <input
                    type={type}
                    disabled={disabled}
                    placeholder={placeholder}
                    value={value}
                    onChange={onChange}
                    className={`w-full py-3 rounded-xl border bg-white/[0.02] text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition-all duration-200 text-sm
                        ${Icon ? 'pl-11 pr-4' : 'px-4'}
                        ${
                            error
                                ? 'border-red-500/40 focus:ring-red-500/20 focus:border-red-500'
                                : 'border-white/10 focus:ring-blue-500/20 focus:border-blue-500/70'
                        }
                        ${disabled ? 'opacity-40 cursor-not-allowed' : ''}
                        ${className}`}
                    {...props}
                />
            </div>
            {error && (
                <span className="text-xs text-red-400 font-medium mt-0.5 select-none">
                    {error}
                </span>
            )}
        </motion.div>
    )
}

/**
 * 3. GlassCard Component
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
                  whileHover: { y: -4, borderColor: 'rgba(255, 255, 255, 0.18)' },
                  transition: { duration: 0.25, ease: 'easeOut' },
              }
            : {}

    return (
        <motion.div
            onClick={onClick}
            className={`rounded-2xl border border-white/8 bg-white/[0.03] backdrop-blur-xl ${padding} shadow-xl relative overflow-hidden ${
                onClick ? 'cursor-pointer' : ''
            } ${className}`}
            {...motionProps}
            {...props}
        >
            {/* Soft inner glow gradient */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.01] to-white/[0.04] pointer-events-none" />
            {children}
        </motion.div>
    )
}

/**
 * 4. Badge Component
 */
export const Badge = ({
    children,
    status = 'info', // 'success' | 'warning' | 'danger' | 'info'
    pulse = false,
    className = '',
}) => {
    const statusClasses = {
        success: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
        warning: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
        danger: 'text-red-400 bg-red-500/10 border-red-500/20',
        info: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    }

    const dotPulseColors = {
        success: 'bg-emerald-400',
        warning: 'bg-amber-400',
        danger: 'bg-red-400',
        info: 'bg-blue-400',
    }

    return (
        <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border ${statusClasses[status]} ${className}`}
        >
            {pulse && (
                <span className="relative flex h-1.5 w-1.5">
                    <span
                        className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${dotPulseColors[status]}`}
                    />
                    <span
                        className={`relative inline-flex rounded-full h-1.5 w-1.5 ${dotPulseColors[status]}`}
                    />
                </span>
            )}
            {children}
        </span>
    )
}

/**
 * 5. Modal Component
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

    // Scroll lock
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }
        return () => {
            document.body.style.overflow = ''
        }
    }, [isOpen])

    // Escape listener
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onClose?.()
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isOpen, onClose])

    const sizeClasses = {
        sm: 'max-w-md',
        md: 'max-w-xl',
        lg: 'max-w-3xl',
        xl: 'max-w-5xl',
    }

    const overlayVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1 },
    }

    const contentVariants = prefersReducedMotion
        ? {
              hidden: { opacity: 0 },
              visible: { opacity: 1 },
          }
        : {
              hidden: { opacity: 0, scale: 0.96, y: 10 },
              visible: { opacity: 1, scale: 1, y: 0 },
          }

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        className="fixed inset-0 bg-black/60 backdrop-blur-md"
                        initial="hidden"
                        animate="visible"
                        exit="hidden"
                        variants={overlayVariants}
                        transition={{ duration: 0.2 }}
                        onClick={onClose}
                    />

                    {/* Modal Window */}
                    <motion.div
                        ref={modalRef}
                        className={`w-full rounded-2xl border border-white/10 bg-gradient-to-b from-[#0e1322] to-[#080b14] p-6 shadow-2xl relative z-10 overflow-hidden ${sizeClasses[size]} ${className}`}
                        initial="hidden"
                        animate="visible"
                        exit="hidden"
                        variants={contentVariants}
                        transition={{ duration: 0.3, ease: 'easeOut' }}
                    >
                        {/* Header */}
                        <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
                            {title && (
                                <h3 className="text-lg font-bold text-white tracking-tight">
                                    {title}
                                </h3>
                            )}
                            <button
                                onClick={onClose}
                                className="text-gray-400 hover:text-white transition-colors cursor-pointer p-1.5 hover:bg-white/5 rounded-lg"
                                aria-label="Close modal"
                            >
                                <svg
                                    className="w-5 h-5"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                            </button>
                        </div>

                        {/* Content */}
                        <div className="text-gray-300 text-sm overflow-y-auto max-h-[70vh]">
                            {children}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}
