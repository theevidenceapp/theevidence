import React, { useEffect, useRef } from "react";
import worldMap from "../assets/world-map.png";
import { openAuthModal } from "../lib/authModal";

const HeroSection = () => {
  const headingRef = useRef<HTMLDivElement>(null);
  const subTextRef = useRef<HTMLDivElement>(null);
  const buttonsRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    let ctx: any;

    const initAnimation = async () => {
      const { default: gsap } = await import("gsap");

      ctx = gsap.context(() => {
        const tl = gsap.timeline({
          defaults: {
            ease: "power3.out",
          },
        });

        tl.from(headingRef.current?.children ?? [], {
          y: 40,
          opacity: 0,
          duration: 1,
          stagger: 0.15,
        })
          .from(
            subTextRef.current,
            {
              y: 20,
              opacity: 0,
              duration: 0.8,
            },
            "-=0.6",
          )
          .from(
            buttonsRef.current?.children ?? [],
            {
              y: 20,
              opacity: 0,
              duration: 0.6,
              stagger: 0.1,
            },
            "-=0.4",
          )
          .from(
            mapRef.current,
            {
              y: 60,
              opacity: 0,
              duration: 1.2,
              ease: "power2.out",
            },
            "-=0.3",
          );
      });
    };

    initAnimation();

    return () => {
      ctx?.revert();
    };
  }, []);

  return (
    <div className="w-full">
      <div>
        <div className="mt-24 sm:mt-32 md:mt-40 lg:mt-[231px] flex flex-col gap-2 text-center px-4">
          <div
            ref={headingRef}
            className="flex flex-col sm:flex-row flex-wrap justify-center items-center gap-1 sm:gap-2"
          >
            <h1 className="font-semibold text-3xl sm:text-4xl md:text-5xl lg:text-[64px] leading-tight text-black dark:text-white">
              Research, thoughtfully brought to
            </h1>
            <span className="font-extralight text-3xl sm:text-4xl md:text-5xl lg:text-[64px] italic font-literata text-black dark:text-white">
              light
            </span>
          </div>
          <div
            ref={subTextRef}
            className="text-sm sm:text-base md:text-lg lg:text-[20px] font-normal font-extralight text-black/70 dark:text-white/70 max-w-xl md:max-w-2xl mx-auto"
          >
            A considered home for research—written with care, reviewed with
            rigor,
            <br className="hidden sm:block" />
            and published for everyone to read.
          </div>
        </div>

        <div
          ref={buttonsRef}
          className="mt-8 sm:mt-10 md:mt-12 lg:mt-15 flex flex-col sm:flex-row justify-center items-center gap-4 sm:gap-6 md:gap-15 px-4"
        >
          <button
            onClick={() => openAuthModal("signup")}
            className="w-full sm:w-auto rounded-full bg-brand-primary px-6 sm:px-8 py-3 sm:py-4 text-sm sm:text-base text-white dark:bg-brand-primary dark:text-white"
          >
            Be a researcher
          </button>
          <button className="w-full sm:w-auto rounded-full bg-brand-gray px-6 sm:px-8 py-3 sm:py-4 text-sm sm:text-base text-white dark:bg-brand-gray dark:text-white">
            Explore researches
          </button>
        </div>
      </div>

      <div className="flex justify-center mt-8 sm:mt-10 md:mt-12 px-4">
        <img
          ref={mapRef}
          className="h-auto w-full max-w-360 dark:opacity-90 dark:invert-0"
          src={worldMap.src}
          alt="World map"
        />
      </div>
    </div>
  );
};

export default HeroSection;
