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
                            <div>
                                <label htmlFor="email" className="block text-sm/6 font-medium ">
                                    Email address
                                </label>
                                <div className="mt-2">
                                    <input
                                        id="email"
                                        name="email"
                                        type="email"
                                        required
                                        autoComplete="email"
                                        className="block border w-full rounded-md bg-white/5 px-3 py-1.5 text-base  outline-1 -outline-offset-1 outline-white/10 placeholder: focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-500 sm:text-sm/6"
                                    />
                                </div>
                            </div>

                            <div>
                                <div className="flex items-center justify-between">
                                    <label htmlFor="password" className="block text-sm/6 font-medium ">
                                        Password
                                    </label>
                                    <div className="text-sm">
                                        <a href="#" className="font-semibold text-indigo-400 hover:text-indigo-300">
                                            Forgot password?
                                        </a>
                                    </div>
                                </div>
                                <div className="mt-2">
                                    <input
                                        id="password"
                                        name="password"
                                        type="password"
                                        required
                                        autoComplete="current-password"
                                        className="block border w-full rounded-md bg-white/5 px-3 py-1.5 text-base  outline-1 -outline-offset-1 outline-white/10 placeholder: focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-500 sm:text-sm/6"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-2 flex-col">
                                <button
                                    type="submit"
                                    className="flex w-full justify-center rounded-md bg-indigo-500 text-white px-3 py-1.5 text-sm/6 font-semibold  hover:bg-indigo-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
                                >
                                    Sign in
                                </button>
                                <button
                                    onClick={handleGoogleSignIn}
                                    type="button"
                                    className="flex w-full justify-center place-content-center items-center rounded-md bg-indigo-500 text-white px-3 py-1.5 text-sm/6 font-semibold  hover:bg-indigo-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
                                >
                                    Sign in with Google
                                </button>
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
