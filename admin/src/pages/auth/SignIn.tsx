import { Button } from "@/components/ui/button"

export default function SignIn() {

    const handleGoogleSignIn = () => {
        window.location.href = `${import.meta.env.VITE_API_URL}/user/auth/google?site=admin`
    }

    return (
        <>
            <div className="h-screen flex items-center justify-center">
                <div className="flex min-h-full flex-col justify-center px-6 py-12 lg:px-8">
                    <div className="sm:mx-auto sm:w-full sm:max-w-sm">
                        <img
                            alt="Your Company"
                            src="https://pub-d65f9d792dba44cfb4b36fdd1925ed72.r2.dev/theevidence.png"
                            className="mx-auto h-50 w-auto"
                            draggable='false'
                        />
                        <h2 className="mt-10 text-center text-2xl/9 font-bold tracking-tight ">Sign in to Admin dashboard</h2>
                    </div>

                    <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
                        <form action="#" method="POST" className="space-y-6">
                            <div className="flex gap-2 flex-col">
                                <Button className='text-lg py-7' onClick={handleGoogleSignIn} type="button">
                                    Sign in with Google
                                </Button>
                            </div>
                        </form>

                        <p className="mt-10 text-center text-sm/6 ">
                            Not a admin?{' '}
                            <a href="#" className="font-semibold text-indigo-400 hover:text-indigo-300">
                                The website is restricted to admins
                            </a>
                        </p>
                    </div>
                </div>
            </div>
        </>
    )
}
