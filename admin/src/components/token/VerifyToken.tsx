import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore, type UserRole } from '@/store/adminAuthStore';
import useTitle from '@/hooks/useTitle';

const roleRedirectMap: Record<UserRole, string> = {
    ADMIN: '/admin/dashboard',
    EDITOR: '/editor/overview',
    RESEARCHER: '/unauthorized-access',
    READER: '/unauthorized-access',
};

const isValidRole = (value: string | null): value is UserRole => {
    return !!value && value in roleRedirectMap;
};

const VerifyToken = () => {
    const navigate = useNavigate();
    useTitle('Verifying...');

    const setAccessToken = useAuthStore((state) => state.setAccessToken);
    const setRole = useAuthStore((state) => state.setRole);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const token = params.get('token');
        const role = params.get('role');

        if (!token || !isValidRole(role)) {
            console.error('Missing or invalid token/role');
            navigate('/auth/login', { replace: true });
            return;
        }

        setAccessToken(token);
        setRole(role);

        navigate(roleRedirectMap[role], { replace: true });
    }, [navigate, setAccessToken, setRole]);

    return <div className='h-screen place-content-center flex justify-center'>Verifying...</div>;
};

export default VerifyToken;