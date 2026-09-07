import React from 'react'
import { useAuthStore } from '../../store/authStore'
import { navigate } from 'astro:transitions/client'

const AuthGate = () => {
    const isInitialized = useAuthStore(
        (state) => state.isInitialized
    )

    const token = useAuthStore((state) => state.token)

    if (isInitialized) {
        return null
    }

    return (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-white">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-300 border-t-black" />
        </div>
    )
}

export default AuthGate