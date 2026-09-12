import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";

const VerifyToken = () => {
    const navigate = useNavigate();

    const setAccessToken = useAuthStore(
        (state) => state.setAccessToken
    );

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);

        const token = params.get("token");

        if (!token) {
            console.error("No token found");
            return;
        }

        // Store token in memory
        setAccessToken(token);

        // Remove token from URL
        navigate("/admin/dashboard", { replace: true });
    }, [navigate, setAccessToken]);

    return <div>Verifying...</div>;
};

export default VerifyToken;