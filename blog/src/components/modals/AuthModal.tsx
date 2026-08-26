import React, { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { X } from "lucide-react";

import illus from "../../assets/illus.png";

const THE_EVIDENCE_LOGO =
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

const EvidenceLogo = ({
    className = "",
}: {
    className?: string;
}) => {
    return (
        <img
            src={THE_EVIDENCE_LOGO}
            alt="The Evidence"
            draggable={false}
            className={`block object-contain ${className}`}
        />
    );
};

/* -------------------------------------------------------
   Google Icon
------------------------------------------------------- */

const GoogleIcon = () => (
    <svg
        width="30"
        height="30"
        viewBox="0 0 48 48"
        aria-hidden="true"
        className="shrink-0"
    >
        <path
            fill="#fff"
            d="M44.5 20H24v8.5h11.8C34.8 33.8 30.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.3 0 6.1 1.2 8.4 3.5l6.2-6.2C34.8 4.1 29.8 2 24 2 12 2 2.3 11.7 2.3 23.7S12 45.5 24 45.5c10.9 0 20.3-7.9 20.3-21.8 0-1.4-.1-2.5-.3-3.7h.5Z"
        />
    </svg>
);

/* -------------------------------------------------------
   Google Auth Button
------------------------------------------------------- */

interface GoogleButtonProps {
    mode: AuthMode;
    onClick: () => void;
}

const GoogleButton = ({
    mode,
    onClick,
}: GoogleButtonProps) => {
    return (
        <button
            type="button"
            onClick={onClick}
            className="
                flex
                h-[57px]
                w-[274px]
                shrink-0
                items-center
                justify-center
                gap-[10px]
                rounded-full
                bg-[#2864e8]
                px-5
                text-[18px]
                font-normal
                leading-none
                text-white
                transition-[background-color,transform]
                duration-200
                hover:bg-[#235bd4]
                active:scale-[0.985]
            "
        >
            <span>
                {mode === "signup"
                    ? "Sign up with Google"
                    : "Sign in with Google"}
            </span>

            <GoogleIcon />
        </button>
    );
};

/* -------------------------------------------------------
   Account Switch
------------------------------------------------------- */

interface AccountSwitchProps {
    mode: AuthMode;
    onSwitch: (mode: AuthMode) => void;
}

const AccountSwitch = ({
    mode,
    onSwitch,
}: AccountSwitchProps) => {
    return (
        <p className="mt-[17px] whitespace-nowrap text-[16px] leading-[20px] text-[#777]">
            {mode === "signup" ? (
                <>
                    Already have an account?{" "}
                    <button
                        type="button"
                        onClick={() => onSwitch("signin")}
                        className="
                            text-[#686868]
                            underline
                            underline-offset-[3px]
                            transition-colors
                            duration-150
                            hover:text-black
                        "
                    >
                        Sign in
                    </button>
                </>
            ) : (
                <>
                    Don&apos;t have an account?{" "}
                    <button
                        type="button"
                        onClick={() => onSwitch("signup")}
                        className="
                            text-[#686868]
                            underline
                            underline-offset-[3px]
                            transition-colors
                            duration-150
                            hover:text-black
                        "
                    >
                        Sign up
                    </button>
                </>
            )}
        </p>
    );
};

/* -------------------------------------------------------
   Footer
------------------------------------------------------- */

const SignupFooter = () => (
    <p className="whitespace-nowrap text-[13px] leading-[20px] text-[#111]">
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
);

const SigninFooter = () => (
    <p className="whitespace-nowrap text-[15px] leading-[20px] text-[#111]">
        Return to where your research belongs
    </p>
);

/* -------------------------------------------------------
   Header
------------------------------------------------------- */

const SignupHeader = () => (
    <div
        className="
            absolute
            left-0
            right-0
            top-[63px]
            flex
            items-center
            justify-center
        "
    >
        <div className="flex items-center gap-[14px]">
            <h1
                className="
                    m-0
                    whitespace-nowrap
                    text-[30px]
                    font-bold
                    leading-[36px]
                    tracking-[-0.8px]
                    text-black
                "
            >
                Become a part of
            </h1>

            <EvidenceLogo className="h-[72px] w-[160px]" />
        </div>
    </div>
);

const SigninHeader = () => (
    <div
        className="
            absolute
            left-0
            right-0
            top-[55px]
            flex
            items-center
            justify-center
        "
    >
        <EvidenceLogo className="h-[88px] w-[175px]" />
    </div>
);

/* -------------------------------------------------------
   Illustration
------------------------------------------------------- */

const Illustration = () => (
    <div
        className="
            absolute
            left-[437px]
            top-[221px]
            flex
            h-[220px]
            w-[410px]
            items-center
            justify-center
        "
    >
        <img
            src={illus.src}
            alt=""
            draggable={false}
            className="
                block
                h-auto
                w-[380px]
                max-w-none
                object-contain
            "
        />
    </div>
);

/* -------------------------------------------------------
   Left Content
------------------------------------------------------- */

interface MainContentProps {
    mode: AuthMode;
    onSwitch: (mode: AuthMode) => void;
    onGoogleAuth: () => void;
}

const MainContent = ({
    mode,
    onSwitch,
    onGoogleAuth,
}: MainContentProps) => {
    return (
        <div
            className="
                absolute
                left-[120px]
                top-[252px]
                flex
                w-[300px]
                flex-col
                items-start
                text-center
            "
        >
            <h2
                className="
                    m-0
                    text-center
                    ml-10
                    whitespace-nowrap
                    font-literata
                    text-[36px]
                    font-normal
                    italic
                    leading-[44px]
                    tracking-[-0.7px]
                    text-black
                "
            >
                {mode === "signup"
                    ? "Be a researcher"
                    : "Welcome back"}
            </h2>

            <div className="mt-[21px]">
                <GoogleButton
                    mode={mode}
                    onClick={onGoogleAuth}
                />

                <AccountSwitch
                    mode={mode}
                    onSwitch={onSwitch}
                />
            </div>
        </div>
    );
};

/* -------------------------------------------------------
   Footer Content
------------------------------------------------------- */

const FooterContent = ({
    mode,
}: {
    mode: AuthMode;
}) => {
    return (
        <div
            className="
                absolute
                bottom-[60px]
                left-0
                right-0
                flex
                justify-center
            "
        >
            {mode === "signup" ? (
                <SignupFooter />
            ) : (
                <SigninFooter />
            )}
        </div>
    );
};

/* -------------------------------------------------------
   Auth Modal
------------------------------------------------------- */

const AuthModal = ({
    display,
    setDisplay,
    initialMode,
}: DisplayProps) => {
    const [mode, setMode] = useState<AuthMode>(
        initialMode ?? "signup",
    );

    const overlayRef = useRef<HTMLDivElement>(null);
    const modalRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    /* -----------------------------------------------------
       Reset mode whenever the modal opens
    ----------------------------------------------------- */

    useEffect(() => {
        if (display) {
            setMode(initialMode ?? "signup");
        }
    }, [display, initialMode]);

    /* -----------------------------------------------------
       Open animation
    ----------------------------------------------------- */

    useEffect(() => {
        if (!overlayRef.current || !modalRef.current) {
            return;
        }

        if (display) {
            gsap.set(overlayRef.current, {
                display: "flex",
            });

            gsap.fromTo(
                overlayRef.current,
                {
                    opacity: 0,
                },
                {
                    opacity: 1,
                    duration: 0.25,
                    ease: "power2.out",
                },
            );

            gsap.fromTo(
                modalRef.current,
                {
                    opacity: 0,
                    scale: 0.985,
                    y: 14,
                },
                {
                    opacity: 1,
                    scale: 1,
                    y: 0,
                    duration: 0.35,
                    ease: "power3.out",
                },
            );
        }
    }, [display]);

    /* -----------------------------------------------------
       Switch signup / signin
    ----------------------------------------------------- */

    const switchMode = (next: AuthMode) => {
        if (
            !contentRef.current ||
            next === mode
        ) {
            return;
        }

        gsap.to(contentRef.current, {
            opacity: 0,
            y: 7,
            duration: 0.14,
            ease: "power2.in",
            onComplete: () => {
                setMode(next);

                gsap.fromTo(
                    contentRef.current,
                    {
                        opacity: 0,
                        y: -7,
                    },
                    {
                        opacity: 1,
                        y: 0,
                        duration: 0.24,
                        ease: "power2.out",
                    },
                );
            },
        });
    };

    /* -----------------------------------------------------
       Close
    ----------------------------------------------------- */

    const handleClose = () => {
        if (
            !overlayRef.current ||
            !modalRef.current
        ) {
            return;
        }

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
                if (!overlayRef.current) {
                    return;
                }

                gsap.set(
                    overlayRef.current,
                    {
                        display: "none",
                    },
                );

                setDisplay();
            },
        });
    };

    /* -----------------------------------------------------
       Escape key
    ----------------------------------------------------- */

    useEffect(() => {
        if (!display) {
            return;
        }

        const handleKeyDown = (
            event: KeyboardEvent,
        ) => {
            if (event.key === "Escape") {
                handleClose();
            }
        };

        window.addEventListener(
            "keydown",
            handleKeyDown,
        );

        return () => {
            window.removeEventListener(
                "keydown",
                handleKeyDown,
            );
        };
    }, [display]);

    /* -----------------------------------------------------
       Google authentication
    ----------------------------------------------------- */

    const handleGoogleAuth = () => {
        window.location.href =
            `${import.meta.env.PUBLIC_API_URL}/user/auth/google`;
    };

    if (!display) {
        return null;
    }

    return (
        <div
            ref={overlayRef}
            className="
                fixed
                inset-0
                z-50
                hidden
                items-center
                justify-center
                overflow-hidden
                bg-[#1e1e1e]
                px-4
                py-4
            "
            onMouseDown={(event) => {
                if (
                    event.target ===
                    event.currentTarget
                ) {
                    handleClose();
                }
            }}
        >
            {/* -------------------------------------------------
                Modal
            ------------------------------------------------- */}

            <div
                ref={modalRef}
                role="dialog"
                aria-modal="true"
                className="
                    relative
                    h-[602px]
                    w-[980px]
                    shrink-0
                    overflow-hidden
                    rounded-[10px]
                    bg-[#f3f3f3]
                "
            >
                {/* -------------------------------------------------
                    Close
                ------------------------------------------------- */}

                <button
                    type="button"
                    onClick={handleClose}
                    aria-label="Close"
                    className="
                        absolute
                        right-[26px]
                        top-[25px]
                        z-30
                        flex
                        h-[28px]
                        w-[28px]
                        items-center
                        justify-center
                        p-0
                        text-black
                        transition-transform
                        duration-150
                        hover:scale-105
                        active:scale-95
                    "
                >
                    <X
                        size={27}
                        strokeWidth={1.65}
                    />
                </button>

                {/* -------------------------------------------------
                    Animated content
                ------------------------------------------------- */}

                <div
                    ref={contentRef}
                    className="
                        relative
                        h-full
                        w-full
                    "
                >
                    {/* Header */}
                    {mode === "signup" ? (
                        <SignupHeader />
                    ) : (
                        <SigninHeader />
                    )}

                    {/* Main left-side content */}
                    <MainContent
                        mode={mode}
                        onSwitch={switchMode}
                        onGoogleAuth={
                            handleGoogleAuth
                        }
                    />

                    {/* Illustration */}
                    <Illustration />

                    {/* Footer */}
                    <FooterContent mode={mode} />
                </div>
            </div>
        </div>
    );
};

export default AuthModal;