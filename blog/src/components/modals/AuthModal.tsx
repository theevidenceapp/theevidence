import React, { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { X } from "lucide-react";

import TheEvidenceDarkLogo from "../../assets/dark-logo.png";
import illus from "../../assets/illus.png";

const THE_EVIDENCE_LIGHT_LOGO =
    "https://pub-d65f9d792dba44cfb4b36fdd1925ed72.r2.dev/theevidence.png";

interface DisplayProps {
    display: boolean;
    setDisplay: () => void;
    initialMode?: AuthMode;
}

type AuthMode = "signup" | "signin";

/* -------------------------------------------------------
   Logo
------------------------------------------------------- */

const EvidenceLogo = ({ className }: { className: string }) => {
    return (
        <>
            <div className="">
                <img
                    src={THE_EVIDENCE_LIGHT_LOGO}
                    alt="The Evidence"
                    className={`${className} dark:hidden`}
                />

                <img
                    src={THE_EVIDENCE_LIGHT_LOGO}
                    alt="The Evidence"
                    className={`${className} hidden dark:block`}
                />
            </div>
        </>
    );
};

/* -------------------------------------------------------
   Google Icon
------------------------------------------------------- */

const GoogleIcon = () => (
    <svg width="30" height="30" viewBox="0 0 48 48" aria-hidden="true">
        <path
            fill="#fff"
            d="M44.5 20H24v8.5h11.8C34.8 33.8 30.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.3 0 6.1 1.2 8.4 3.5l6.2-6.2C34.8 4.1 29.8 2 24 2 12 2 2.3 11.7 2.3 23.7S12 45.5 24 45.5c10.9 0 20.3-7.9 20.3-21.8 0-1.4-.1-2.5-.3-3.7h.5Z"
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

    /* Reset mode whenever modal opens */
    useEffect(() => {
        if (display) {
            setMode(initialMode ?? "signup");
        }
    }, [display, initialMode]);

    /* Open animation */
    useEffect(() => {
        if (!overlayRef.current || !modalRef.current) return;

        if (display) {
            gsap.set(overlayRef.current, { display: "flex" });

            gsap.fromTo(
                overlayRef.current,
                { opacity: 0 },
                { opacity: 1, duration: 0.25, ease: "power2.out" },
            );

            gsap.fromTo(
                modalRef.current,
                { opacity: 0, scale: 0.985, y: 14 },
                { opacity: 1, scale: 1, y: 0, duration: 0.35, ease: "power3.out" },
            );
        }
    }, [display]);

    /* Switch between signup / signin */
    const switchMode = (next: AuthMode) => {
        if (!contentRef.current || next === mode) return;

        gsap.to(contentRef.current, {
            opacity: 0,
            y: 7,
            duration: 0.14,
            ease: "power2.in",
            onComplete: () => {
                setMode(next);

                gsap.fromTo(
                    contentRef.current,
                    { opacity: 0, y: -7 },
                    { opacity: 1, y: 0, duration: 0.24, ease: "power2.out" },
                );
            },
        });
    };

    /* Close */
    const handleClose = () => {
        if (!overlayRef.current || !modalRef.current) return;

        gsap.to(modalRef.current, {
            opacity: 0,
            scale: 0.985,
            y: 14,
            duration: 0.2,
            ease: "power2.in",
        });

        gsap.to(overlayRef.current, {
            opacity: 0,
            duration: 0.2,
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
            className="fixed inset-0 z-50 hidden items-center justify-center bg-black/60 p-4 sm:p-5"
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    handleClose();
                }
            }}
        >
            {/* Modal */}
            <div
                ref={modalRef}
                className="relative flex w-full max-w-[933px] max-h-[90vh] flex-col overflow-hidden rounded-[14px] bg-[#f2f2f2] shadow-[0_20px_60px_rgba(0,0,0,0.25)]"
            >
                {/* Close button */}
                <button
                    type="button"
                    onClick={handleClose}
                    aria-label="Close"
                    className="absolute right-[20px] top-[20px] z-20 flex h-8 w-8 items-center justify-center text-[#111] transition-transform duration-200 hover:scale-105"
                >
                    <X size={25} strokeWidth={1.8} />
                </button>

                {/* Animated content */}
                <div ref={contentRef} className="flex min-h-0 flex-col">
                    {/* HEADER */}
                    <div className="flex w-full items-center justify-center px-8 pt-[34px] sm:pt-[36px]">
                        {mode === "signup" ? (
                            <div className="flex items-center justify-center gap-[14px]">
                                <h1 className="whitespace-nowrap text-[28px] font-bold leading-none tracking-[-0.7px] text-black sm:text-[30px]">
                                    Become a part of
                                </h1>
                                <EvidenceLogo className="h-[64px] w-auto object-contain sm:h-[72px]" />
                            </div>
                        ) : (
                            <EvidenceLogo className="h-[80px] w-auto object-contain sm:h-[88px]" />
                        )}
                    </div>

                    {/* MAIN CONTENT */}
                    <div className="flex min-h-0 flex-col md:flex-row">
                        {/* LEFT / AUTH CONTENT */}
                        <div className="flex w-full flex-col items-center px-8 pb-8 pt-[30px] sm:px-10 sm:pb-8 md:w-1/2 md:items-start md:px-[64px] md:pt-[24px]">
                            {/* Heading */}
                            <h2 className="font-serif text-[34px] italic leading-[1.15] tracking-[-0.5px] text-black sm:text-[38px] md:text-[36px] font-literata">
                                {mode === "signup" ? "Be a researcher" : "Welcome back"}
                            </h2>

                            {/* Google button + account switch */}
                            <div className="mt-[22px] flex w-full flex-col items-center md:items-start">
                                <button
                                    type="button"
                                    onClick={handleGoogleAuth}
                                    className="flex h-[52px] w-full max-w-[380px] items-center justify-center gap-[11px] rounded-full bg-[#2864e8] px-6 text-[17px] font-normal leading-none text-white transition-all duration-200 hover:bg-[#235bd4] hover:scale-[1.01] active:scale-[0.985] sm:h-[54px] sm:text-[18px]"
                                >
                                    <span>
                                        {mode === "signup"
                                            ? "Sign up with Google"
                                            : "Sign in with Google"}
                                    </span>

                                    <GoogleIcon />
                                </button>

                                {/* Account switch */}
                                <p className="mt-[17px] text-[15px] leading-none text-[#777] sm:text-[16px]">
                                    {mode === "signup" ? (
                                        <>
                                            Already have an account?{" "}
                                            <button
                                                type="button"
                                                onClick={() => switchMode("signin")}
                                                className="text-[#686868] underline underline-offset-[3px] transition-colors hover:text-black"
                                            >
                                                Sign in
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            Don&apos;t have an account?{" "}
                                            <button
                                                type="button"
                                                onClick={() => switchMode("signup")}
                                                className="text-[#686868] underline underline-offset-[3px] transition-colors hover:text-black"
                                            >
                                                Sign up
                                            </button>
                                        </>
                                    )}
                                </p>
                            </div>

                            {/* Footer text */}
                            <div className="mt-auto w-full pt-[30px]">
                                {mode === "signup" ? (
                                    <p className="text-center text-[13px] leading-[1.5] text-[#111] md:text-left">
                                        By clicking &quot;Sign up&quot; you agree our{" "}
                                        <a
                                            href="/privacy"
                                            className="underline underline-offset-[2px]"
                                        >
                                            Privacy
                                        </a>{" "}
                                        &{" "}
                                        <a
                                            href="/terms"
                                            className="underline underline-offset-[2px]"
                                        >
                                            Terms
                                        </a>
                                    </p>
                                ) : (
                                    <p className="text-center text-[15px] leading-[1.5] text-[#111] md:text-left">
                                        Return to where your research belongs
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* RIGHT / ILLUSTRATION */}
                        <div className="hidden w-1/2 items-center justify-center px-6 pb-8 pt-[16px] md:flex">
                            <img
                                src={illus.src}
                                alt=""
                                className="h-auto w-full max-w-[340px] object-contain"
                                onError={(e) => {
                                    e.currentTarget.style.display = "none";
                                }}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AuthModal;