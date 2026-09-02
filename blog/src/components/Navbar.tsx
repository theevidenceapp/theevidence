// src/components/Navbar.tsx
import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import darkLogo from "../assets/dark-logo.png";
import { openAuthModal } from "../lib/authModal";
import { LOGO_URL } from "../constants";

const Navbar = () => {
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        navRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.8, ease: "power2.out" },
      );
    }, navRef);

    return () => ctx.revert();
  }, []);

  const logoUrl = LOGO_URL;

  return (
    <div className="flex justify-center px-4 sm:px-6" ref={navRef}>
      <div className="w-full max-w-299.75 shadow-[0_0_15px_0_rgba(0,0,0,0.05)] dark:border-gray-700 h-auto min-h-14 sm:h-17.5 rounded-full mt-6 sm:mt-8 md:mt-10 flex justify-between items-center bg-white dark:bg-[#262626] z-10 px-4 sm:px-0">
        <img
          className="w-14 h-8.5 sm:w-16 sm:h-9.75 md:w-20 md:h-12.25 sm:ml-6.25 block dark:hidden"
          src={logoUrl}
          draggable="false"
          alt="the evidence"
        />
        <img
          className="w-14 h-8.5 sm:w-16 sm:h-9.75 md:w-20 md:h-12.25 sm:ml-6.25 hidden dark:block"
          src={darkLogo.src}
          draggable="false"
          alt="the evidence"
        />
        <div className="sm:mr-6">
          <ul className="flex gap-3 sm:gap-5 md:gap-8 items-center">
            <li className="hidden md:block text-blue-600 dark:text-blue-400 font-medium text-sm lg:text-base cursor-pointer">
              Home
            </li>
            <li className="hidden md:block text-gray-800 dark:text-gray-200 text-sm lg:text-base cursor-pointer hover:text-gray-500 dark:hover:text-gray-400 transition-colors">
              About
            </li>
            <li
              onClick={() => openAuthModal("signup")}
              className="bg-brand-primary text-white px-4 sm:px-6 md:px-8 py-2 sm:py-3 md:py-4 rounded-full text-xs sm:text-sm md:text-base whitespace-nowrap cursor-pointer"
            >
              Be a researcher
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Navbar;