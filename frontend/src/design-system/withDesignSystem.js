import { useContext } from 'react'
import { DesignSystemContext } from './DesignSystemContext.js'

export default function withDesignSystem() {
    return function WrappedWithDesignSystem(props) {
        const ds = useContext(DesignSystemContext)
      
        const Component = props?.component
        if (!Component) return null
        return <Component {...props} designSystem={ds} />
    }
}



