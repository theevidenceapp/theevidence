import React, { useEffect, useState } from "react";
import AuthModal from "./AuthModal";

export type AuthMode = "signup" | "signin";

const AuthModalController = () => {
  const [display, setDisplay] = useState(false);
  const [mode, setMode] = useState<AuthMode>("signup");

  useEffect(() => {
    const handler = (e: Event) => {
      const detailMode = (e as CustomEvent<{ mode?: AuthMode }>).detail?.mode;
      setMode(detailMode ?? "signup");
      setDisplay(true);
    };
    window.addEventListener("open-auth-modal", handler);
    return () => window.removeEventListener("open-auth-modal", handler);
  }, []);

  return (
    <AuthModal
      display={display}
      setDisplay={() => setDisplay(false)}
      initialMode={mode}
    />
  );
};

export default AuthModalController;
