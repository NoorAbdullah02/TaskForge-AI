import React, { useMemo, useState, useEffect } from 'react'



import { designTokens } from './theme'
import { DesignSystemContext } from './DesignSystemContext.js'








function usePrefersReducedMotion() {
    const [reduced, setReduced] = useState(false)

    useEffect(() => {
        const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)')
        if (!mq) return
        const update = () => setReduced(!!mq.matches)
        update()
        // Safari compatibility
        if (mq.addEventListener) mq.addEventListener('change', update)
        else mq.addListener(update)
        return () => {
            if (mq.removeEventListener) mq.removeEventListener('change', update)
            else mq.removeListener(update)
        }
    }, [])

    return reduced
}

export default function DesignSystemProvider({ children }) {
    const prefersReducedMotion = usePrefersReducedMotion()
    const [themeMode, setThemeMode] = useState('light')



    const value = useMemo(() => {
        return {
            tokens: designTokens,
            themeMode,
            setThemeMode,
            prefersReducedMotion,
        }
    }, [themeMode, prefersReducedMotion])

    return <DesignSystemContext.Provider value={value}>{children}</DesignSystemContext.Provider>
}

