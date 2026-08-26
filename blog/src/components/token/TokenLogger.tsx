import React, { useEffect } from 'react'
import { useAuthStore } from '../../store/authStore'

const TokenLogger = () => {
    const token = useAuthStore((state) => state.token);
    useEffect(() => {
        console.log(token);
    }, [])
    return null
}

export default TokenLogger
