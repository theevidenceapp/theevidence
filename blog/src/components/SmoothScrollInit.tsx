import { useEffect } from 'react'
import { initLenis } from '../lib/lenis'

const SmoothScrollInit = () => {
    useEffect(() => {
        const lenis = initLenis()
        return () => {
            lenis.destroy()
        }
    }, [])

    return null
}

export default SmoothScrollInit