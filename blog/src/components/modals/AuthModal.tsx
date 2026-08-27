import React, { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { X } from "lucide-react";
import { stopLenis, startLenis } from "../../lib/lenis";

import illus from "../../assets/illus.png";
import { LOGO_URL } from "../../constants";

const THE_EVIDENCE_LOGO = LOGO_URL

interface DisplayProps {
    display: boolean;
    setDisplay: () => void;
    initialMode?: AuthMode;
}

type AuthMode = "signup" | "signin";

/* -------------------------------------------------------
   Google Icon (Exact white G icon on the right)
------------------------------------------------------- */
const GoogleIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
        <path
            fill="#ffffff"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
            fill="#ffffff"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
            fill="#ffffff"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
        />
        <path
            fill="#ffffff"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
        />
    </svg>
);

/* -------------------------------------------------------
   Auth Modal
------------------------------------------------------- */
const AuthModal = ({ display, setDisplay, initialMode }: DisplayProps) => {
    const [mode, setMode] = useState<AuthMode>(initialMode ?? "signup");

    const overlayRef = useRef<HTMLDivElement>(null);
    const modalRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    /* Sync mode whenever modal opens */
    useEffect(() => {
        if (display) {
            setMode(initialMode ?? "signup");
        }
    }, [display, initialMode]);

    /* Lock body and Lenis scroll when modal is active */
    useEffect(() => {
        if (display) {
            try {
                stopLenis();
            } catch {
                // lenis might not be initialized
            }
            document.body.style.overflow = "hidden";
        } else {
            try {
                startLenis();
            } catch {
                // lenis might not be initialized
            }
            document.body.style.overflow = "";
        }

        return () => {
            try {
                startLenis();
            } catch {
                // lenis cleanup
            }
            document.body.style.overflow = "";
        };
    }, [display]);

    /* Open animation */
    useEffect(() => {
        if (!overlayRef.current || !modalRef.current) return;

        if (display) {
            gsap.set(overlayRef.current, { display: "flex" });

            gsap.fromTo(
                overlayRef.current,
                { opacity: 0 },
                { opacity: 1, duration: 0.25, ease: "power2.out" }
            );

            gsap.fromTo(
                modalRef.current,
                { opacity: 0, scale: 0.98, y: 10 },
                { opacity: 1, scale: 1, y: 0, duration: 0.3, ease: "power3.out" }
            );
        }
    }, [display]);

    /* Switch between signup / signin */
    const switchMode = (next: AuthMode) => {
        if (!contentRef.current || next === mode) return;

        gsap.to(contentRef.current, {
            opacity: 0,
            y: 4,
            duration: 0.12,
            ease: "power2.in",
            onComplete: () => {
                setMode(next);

                gsap.fromTo(
                    contentRef.current,
                    { opacity: 0, y: -4 },
                    { opacity: 1, y: 0, duration: 0.2, ease: "power2.out" }
                );
            },
        });
    };

    /* Close */
    const handleClose = () => {
        if (!overlayRef.current || !modalRef.current) return;

        gsap.to(modalRef.current, {
            opacity: 0,
            scale: 0.98,
            y: 10,
            duration: 0.18,
            ease: "power2.in",
        });

        gsap.to(overlayRef.current, {
            opacity: 0,
            duration: 0.18,
            ease: "power2.in",
            onComplete: () => {
                gsap.set(overlayRef.current, { display: "none" });
                setDisplay();
            },
        });
    };

    const handleGoogleAuth = () => {
        window.location.href = `${import.meta.env.PUBLIC_API_URL}/user/auth/google`;
    };

    if (!display) return null;

    return (
        <div
            ref={overlayRef}
            className="fixed inset-0 z-50 hidden items-center justify-center bg-black/75 p-4 sm:p-6"
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    handleClose();
                }
            }}
        >
            {/* Modal Card */}
            <div
                ref={modalRef}
                className="relative flex w-full max-w-[820px] flex-col overflow-hidden rounded-[10px] bg-[#f7f7f7] px-8 pt-9 pb-8 sm:px-12 sm:pt-10 sm:pb-9 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)]"
            >
                {/* Close 'X' button */}
                <button
                    type="button"
                    onClick={handleClose}
                    aria-label="Close"
                    className="absolute right-6 top-6 z-20 flex h-7 w-7 items-center justify-center text-neutral-800 hover:text-black transition-opacity"
                >
                    <X size={18} strokeWidth={1.75} />
                </button>

                {/* Animated inner container */}
                <div ref={contentRef} className="flex flex-col w-full">
                    
                    {/* Header: Title / Logo */}
                    <div className="flex w-full items-center justify-center h-[52px] mb-8 sm:mb-12">
                        {mode === "signup" ? (
                            <div className="flex items-center justify-center gap-3">
                                <h1 className="text-[26px] sm:text-[28px] font-bold tracking-[-0.02em] text-black">
                                    Become a part of
                                </h1>
                                <img
                                    src={THE_EVIDENCE_LIGHT_LOGO}
                                    alt="The Evidence"
                                    className="h-[46px] w-auto object-contain"
                                />
                            </div>
                        ) : (
                            <div className="flex items-center justify-center">
                                <img
                                    src={THE_EVIDENCE_LIGHT_LOGO}
                                    alt="The Evidence"
                                    className="h-[52px] w-auto object-contain"
                                />
                            </div>
                        )}
                    </div>

                    {/* Content Section: 2 columns */}
                    <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-6 md:gap-2 px-2 sm:px-4">
                        
                        {/* Left Column: Heading, Button, Subtext */}
                        <div className="flex flex-col items-center md:items-start text-center md:text-left pl-0 md:pl-2">
                            <h2 className="font-serif italic text-[28px] sm:text-[32px] text-black tracking-tight leading-tight">
                                {mode === "signup" ? "Be a researcher" : "Welcome back"}
                            </h2>

                            {/* Blue Google Button */}
                            <button
                                type="button"
                                onClick={handleGoogleAuth}
                                className="mt-5 flex h-[42px] w-fit min-w-[210px] items-center justify-center gap-3 rounded-full bg-[#2563eb] px-5 text-[14px] font-normal text-white transition-all hover:bg-[#1d4ed8] active:scale-[0.99]"
                            >
                                <span>
                                    {mode === "signup"
                                        ? "Sign up with Google"
                                        : "Sign in with Google"}
                                </span>
                                <GoogleIcon />
                            </button>

                            {/* Switch prompt */}
                            <p className="mt-3.5 text-[12px] text-neutral-600">
                                {mode === "signup" ? (
                                    <>
                                        Already have an account?{" "}
                                        <button
                                            type="button"
                                            onClick={() => switchMode("signin")}
                                            className="text-neutral-700 underline underline-offset-2 hover:text-black font-normal"
                                        >
                                            Sign in
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        Don’t have an account?{" "}
                                        <button
                                            type="button"
                                            onClick={() => switchMode("signup")}
                                            className="text-neutral-700 underline underline-offset-2 hover:text-black font-normal"
                                        >
                                            Sign up
                                        </button>
                                    </>
                                )}
                            </p>
                        </div>

                        {/* Right Column: Illustration Graphic */}
                        <div className="flex items-center justify-center md:justify-end">
                            <img
                                src={typeof illus === "string" ? illus : (illus as any).src}
                                alt="Illustration"
                                className="w-full max-w-[340px] sm:max-w-[360px] h-auto object-contain pointer-events-none select-none"
                                onError={(e) => {
                                    e.currentTarget.style.display = "none";
                                }}
                            />
                        </div>
                    </div>

                    {/* Bottom Legal / Return Footer text */}
                    <div className="w-full text-center mt-10 sm:mt-14 text-[10px] sm:text-[11px] text-neutral-600 font-normal">
                        {mode === "signup" ? (
                            <p>
                                By clicking &ldquo;Sign up&rdquo; you agree our{" "}
                                <a
                                    href="/privacy"
                                    className="underline underline-offset-2 hover:text-black"
                                >
                                    Privacy
                                </a>{" "}
                                &amp;{" "}
                                <a
                                    href="/terms"
                                    className="underline underline-offset-2 hover:text-black"
                                >
                                    Terms
                                </a>
                            </p>
                        ) : (
                            <p>Return to where your research belongs</p>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
};

export default AuthModal;