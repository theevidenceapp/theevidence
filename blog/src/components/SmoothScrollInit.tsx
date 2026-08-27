import { useEffect } from "react";
import { initLenis, destroyLenis } from "../lib/lenis";

export default function SmoothScrollInit() {
  useEffect(() => {
    initLenis();

    const handlePageLoad = () => initLenis();
    const handleBeforeSwap = () => destroyLenis();

    document.addEventListener("astro:page-load", handlePageLoad);
    document.addEventListener("astro:before-swap", handleBeforeSwap);

    return () => {
      destroyLenis();
      document.removeEventListener("astro:page-load", handlePageLoad);
      document.removeEventListener("astro:before-swap", handleBeforeSwap);
    };
  }, []);

  return null;
}