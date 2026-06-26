import React, { createContext, useContext } from 'react'

export const DesignSystemContext = createContext({})

export function useDesignSystem() {
    return useContext(DesignSystemContext)
}

