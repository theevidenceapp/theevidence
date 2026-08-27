import React from 'react'
import { useAuthStore } from '../../store/authStore'

const AuthGate = () => {
    const isInitialized = useAuthStore(
        (state) => state.isInitialized
    )

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