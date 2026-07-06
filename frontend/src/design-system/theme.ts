export type SemanticStatus = 'success' | 'warning' | 'danger' | 'info'

export const designTokens = {
    // Core surfaces
    colors: {
        primaryBackground: '#FFFFFF',
        secondaryBackground: '#F8FAFC',

        // Premium dark surfaces
        premiumDarkBackground: '#070A12',
        premiumDarkSecondaryBackground: '#0B1220',

        // Base text
        textPrimary: '#0B1220',
        textSecondary: '#4B5563',

        // Dark text
        darkTextPrimary: '#EAF1FF',
        darkTextSecondary: '#A7B0C0',

        // Accents
        primaryBlue: '#2563EB',
        secondaryPurple: '#7C3AED',

        success: '#10B981',
        warning: '#F59E0B',
        danger: '#EF4444',
        info: '#60A5FA',
    },

    // Glass
    glass: {
        // Used with rgba(255,255,255,alpha) + backdrop-filter
        cardLightAlpha: 0.08,
        cardDarkAlpha: 0.06,
        borderAlpha: 0.12,
        blurPx: 14,
    },

    // Radii/spacing
    radius: {
        sm: 10,
        md: 14,
        lg: 18,
        xl: 24,
        '2xl': 28,
    },

    spacing: {
        1: 4,
        2: 8,
        3: 12,
        4: 16,
        5: 20,
        6: 24,
        7: 28,
        8: 32,
        10: 40,
        12: 48,
        14: 56,
        16: 64,
    },

    // Motion
    motion: {
        durationFast: 140,
        durationNormal: 220,
        durationSlow: 420,
        easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
    },

    semanticStatus: {
        success: { color: '#10B981' },
        warning: { color: '#F59E0B' },
        danger: { color: '#EF4444' },
        info: { color: '#60A5FA' },
    } satisfies Record<SemanticStatus, { color: string }>,
}

export const semanticAccentClasses = {
    // For Tailwind usage (optional); keep tokens as source of truth
    success: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    warning: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    danger: 'text-red-400 bg-red-500/10 border-red-500/20',
    info: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
} as const

