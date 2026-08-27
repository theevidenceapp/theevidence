import React, { useEffect } from 'react'
import { useAuthStore } from '../../store/authStore'
import { navigate } from 'astro:transitions/client';

const TokenCapture = () => {

    const setToken = useAuthStore((state) => state.setToken);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const token = params.get('token');

        if (token) {
            setToken(token);
            navigate("/");
        }
    }, [setToken])

    return null;
}

export default TokenCapture
