export type AuthMode = "signup" | "signin";

export const openAuthModal = (mode: AuthMode = "signup") => {
  window.dispatchEvent(
    new CustomEvent("open-auth-modal", { detail: { mode } }),
  );
};
