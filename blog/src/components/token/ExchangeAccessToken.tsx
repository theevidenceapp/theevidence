import React, { useEffect } from 'react'
import { apiClient } from '../../api/api-client'
import { useAuthStore } from '../../store/authStore'

const ExchangeAccessToken = () => {
    const setToken = useAuthStore((state) => state.setToken)
    const setInitialized = useAuthStore((state) => state.setInitialized)

    useEffect(() => {
        const fetchAccessToken = async () => {
            try {
                const res = await apiClient.get('/user/get-access-token')

                setToken(res.data.accessToken)

            } catch (error) {
                console.error(
                    'Failed to restore authentication:',
                    error
                )

                setToken(null)

            } finally {
                setInitialized(true)
            }
        }

        fetchAccessToken()
    }, [setToken, setInitialized])

    return null
}

export default ExchangeAccessToken