import { useSearchParams, useNavigate } from "react-router-dom";
import { ShieldX, ArrowLeft, LogIn } from "lucide-react";

const AdminAccessDenied = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const error = searchParams.get("error");

    if (error !== "admin_access_denied") {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background px-6">
                <div className="text-center">
                    <h1 className="text-2xl font-semibold tracking-tight">
                        Something went wrong
                    </h1>

                    <p className="mt-2 text-sm text-muted-foreground">
                        We couldn't process your request.
                    </p>

                    <button
                        type="button"
                        onClick={() => navigate("/")}
                        className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-6">
            {/* Background decoration */}
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-destructive/5 blur-3xl" />
            </div>

            <div className="relative w-full max-w-md">
                <div className="rounded-2xl border bg-card p-8 shadow-sm">
                    {/* Icon */}
                    <div className="flex justify-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                            <ShieldX
                                className="h-8 w-8 text-destructive"
                                strokeWidth={1.8}
                            />
                        </div>
                    </div>

                    {/* Heading */}
                    <div className="mt-6 text-center">
                        <h1 className="text-2xl font-semibold tracking-tight">
                            Admin access required
                        </h1>

                        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
                            Your Google account is authenticated, but it doesn't have
                            administrator permissions for this application.
                        </p>
                    </div>

                    {/* Information */}
                    <div className="mt-6 rounded-xl border bg-muted/40 p-4">
                        <div className="flex gap-3">
                            <ShieldX className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />

                            <div>
                                <p className="text-sm font-medium">
                                    Access denied
                                </p>

                                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                    Sign in with an administrator account or contact an
                                    administrator if you believe you should have access.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-6 flex flex-col gap-3">
                        <button
                            type="button"
                            onClick={() => navigate("/")}
                            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                        >
                            <LogIn className="h-4 w-4" />
                            Try another account
                        </button>

                        <button
                            type="button"
                            onClick={() => navigate(-1)}
                            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border bg-background px-4 text-sm font-medium transition-colors hover:bg-muted"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Go back
                        </button>
                    </div>
                </div>

                <p className="mt-6 text-center text-xs text-muted-foreground">
                    If you believe this is a mistake, contact your system administrator.
                </p>
            </div>
        </div>
    );
};

export default AdminAccessDenied;