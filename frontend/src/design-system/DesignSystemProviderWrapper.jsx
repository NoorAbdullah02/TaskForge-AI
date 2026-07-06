import React from 'react'
import DesignSystemProvider from './ThemeProvider.jsx'

export default function DesignSystemProviderWrapper({ children }) {
    return <DesignSystemProvider>{children}</DesignSystemProvider>
}

