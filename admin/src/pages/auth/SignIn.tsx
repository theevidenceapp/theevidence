import { Button } from '@/components/ui/button';
import useTitle from '@/hooks/useTitle';

export default function SignIn() {
    useTitle('Sign In');

    const handleGoogleSignInAdmin = () => {
        window.location.href = `${import.meta.env.VITE_API_URL}/user/auth/google?site=admin`;
    };

    const handleGoogleSignInEditor = () => {
        window.location.href = `${import.meta.env.VITE_API_URL}/user/auth/google?site=editor`;
    };

    return (
        <div className="h-screen flex items-center justify-center">
            <div className="flex min-h-full flex-col justify-center px-6 py-12 lg:px-8">
                <div className="sm:mx-auto sm:w-full sm:max-w-sm">
                    <img
                        alt="Your Company"
                        src="https://pub-d65f9d792dba44cfb4b36fdd1925ed72.r2.dev/theevidence.png"
                        className="mx-auto h-50 w-auto"
                        draggable="false"
                    />
                    <h2 className="mt-10 text-center text-2xl/9 font-bold tracking-tight">
                        Sign in to the panel
                    </h2>
                    <p className="mt-2 text-center text-sm text-slate-500">
                        Choose your role to continue
                    </p>
                </div>

                <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
                    <div className="flex gap-3 flex-col">
                        <Button
                            className="text-lg py-7"
                            onClick={handleGoogleSignInAdmin}
                            type="button"
                        >
                            Sign in as Admin
                        </Button>

                        <Button
                            className="text-lg py-7"
                            variant="outline"
                            onClick={handleGoogleSignInEditor}
                            type="button"
                        >
                            Sign in as Editor
                        </Button>
                    </div>

                    <p className="mt-10 text-center text-sm/6 text-slate-500">
                        This portal is restricted to authorized staff.
                    </p>
                </div>
            </div>
        </div>
    );
}