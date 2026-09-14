import { Link } from "react-router-dom";

const UnauthorizedAccess = () => {
    return (
        <div className="h-screen flex items-center justify-center">
            <div className="text-center space-y-3">
                <h1 className="text-6xl font-bold text-neutral-800">403</h1>
                <p className="text-lg text-neutral-600">
                    You don't have permission to access this page.
                </p>
                <Link
                    to="/admin/dashboard"
                    className="inline-block mt-4 px-4 py-2 rounded-md bg-neutral-900 text-white text-sm hover:bg-neutral-700 transition-colors"
                >
                    Go back
                </Link>
            </div>
        </div>
    );
};

export default UnauthorizedAccess;