import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import image1 from "../assets/image1.jpg";
import image2 from "../assets/image2.jpg";
import image3 from "../assets/image3.jpg";
import image4 from "../assets/image4.jpg";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

interface Post {
  title: string;
  imageUrl: string;
  author: string;
  date: string;
}

const Carousel = () => {
  const defaultData: Post[] = [
    {
      title: "Rethinking Digital Sovereignty in an Age of Intelligent Systems",
      imageUrl: image1.src,
      author: "Sam Altman",
      date: "18 August 2026",
    },
    {
      title: "The Future of Work: Embracing AI and Automation",
      imageUrl: image2.src,
      author: "Jane Smith",
      date: "22 September 2026",
    },
    {
      title: "Building Trust in AI: Strategies for Ethical Development",
      imageUrl: image3.src,
      author: "Dr. Emily Chen",
      date: "15 October 2026",
    },
    {
      title: "Navigating the Metaverse: Opportunities and Challenges",
      imageUrl: image4.src,
      author: "Carlos Mendes",
      date: "10 November 2026",
    },
    {
      title: "Rethinking Digital Sovereignty in an Age of Intelligent Systems",
      imageUrl: image1.src,
      author: "Sam Altman",
      date: "18 August 2026",
    },
    {
      title: "The Future of Work: Embracing AI and Automation",
      imageUrl: image2.src,
      author: "Jane Smith",
      date: "22 September 2026",
    },
    {
      title: "Building Trust in AI: Strategies for Ethical Development",
      imageUrl: image3.src,
      author: "Dr. Emily Chen",
      date: "15 October 2026",
    },
    {
      title: "Navigating the Metaverse: Opportunities and Challenges",
      imageUrl: image4.src,
      author: "Carlos Mendes",
      date: "10 November 2026",
    },
    {
      title: "Rethinking Digital Sovereignty in an Age of Intelligent Systems",
      imageUrl: image1.src,
      author: "Sam Altman",
      date: "18 August 2026",
    },
    {
      title: "The Future of Work: Embracing AI and Automation",
      imageUrl: image2.src,
      author: "Jane Smith",
      date: "22 September 2026",
    },
    {
      title: "Building Trust in AI: Strategies for Ethical Development",
      imageUrl: image3.src,
      author: "Dr. Emily Chen",
      date: "15 October 2026",
    },
    {
      title: "Navigating the Metaverse: Opportunities and Challenges",
      imageUrl: image4.src,
      author: "Carlos Mendes",
      date: "10 November 2026",
    },
    {
      title: "Rethinking Digital Sovereignty in an Age of Intelligent Systems",
      imageUrl: image1.src,
      author: "Sam Altman",
      date: "18 August 2026",
    },
    {
      title: "The Future of Work: Embracing AI and Automation",
      imageUrl: image2.src,
      author: "Jane Smith",
      date: "22 September 2026",
    },
    {
      title: "Building Trust in AI: Strategies for Ethical Development",
      imageUrl: image3.src,
      author: "Dr. Emily Chen",
      date: "15 October 2026",
    },
    {
      title: "Navigating the Metaverse: Opportunities and Challenges",
      imageUrl: image4.src,
      author: "Carlos Mendes",
      date: "10 November 2026",
    },
  ];

  const sectionRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollStart = useRef(0);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const cards =
        trackRef.current?.querySelectorAll<HTMLElement>("[data-card]");
      if (!cards || cards.length === 0) return;

      gsap.fromTo(
        cards,
        { opacity: 0, y: 32 },
        {
          opacity: 1,
          y: 0,
          duration: 0.7,
          ease: "power3.out",
          stagger: 0.08,
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 80%",
            once: true,
          },
        },
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!trackRef.current) return;
    isDragging.current = true;
    startX.current = e.clientX;
    scrollStart.current = trackRef.current.scrollLeft;
    trackRef.current.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current || !trackRef.current) return;
    const delta = e.clientX - startX.current;
    const track = trackRef.current;
    const maxScroll = track.scrollWidth - track.clientWidth;
    track.scrollLeft = gsap.utils.clamp(
      0,
      maxScroll,
      scrollStart.current - delta,
    );
  };

  const onPointerUp = () => {
    isDragging.current = false;
  };

  const scrollByCard = (dir: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    const card = track.querySelector<HTMLElement>("[data-card]");
    const gapPx = parseFloat(getComputedStyle(track).columnGap || "0") || 24;
    const amount = card ? card.offsetWidth + gapPx : 300;
    const maxScroll = track.scrollWidth - track.clientWidth;
    const target = gsap.utils.clamp(
      0,
      maxScroll,
      track.scrollLeft + dir * amount,
    );

    gsap.to(track, {
      scrollLeft: target,
      duration: 0.6,
      ease: "power2.out",
    });
  };

  return (
    <div
      className="mt-10 w-full max-w-full overflow-x-hidden"
      ref={sectionRef}
    >
      <div className="px-5 sm:px-8 md:px-16 lg:px-[220px] w-full max-w-full">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-[26px] sm:text-[32px] md:text-[40px] leading-tight dark:text-white">
              What we're thinking about
            </h2>
            <p className="text-[15px] sm:text-[16px] md:text-[18px] text-[#73736F] dark:text-brand-gray mt-2">
              Perspectives on the technologies shaping what comes next.
            </p>
          </div>

          <div className="hidden sm:flex gap-3 shrink-0">
            <button
              onClick={() => scrollByCard(-1)}
              aria-label="Previous"
              type="button"
              className="w-8 h-8 md:w-9 md:h-9 rounded-full border border-[#E5E5E0] dark:border-[#2c2c33] flex items-center justify-center text-[#73736F] dark:text-brand-gray hover:border-[#73736F] dark:hover:border-brand-gray hover:text-black dark:hover:text-white transition-colors"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M10 12L6 8L10 4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <button
              onClick={() => scrollByCard(1)}
              aria-label="Next"
              type="button"
              className="w-8 h-8 md:w-9 md:h-9 rounded-full border border-[#E5E5E0] dark:border-[#2c2c33] flex items-center justify-center text-[#73736F] dark:text-brand-gray hover:border-[#73736F] dark:hover:border-brand-gray hover:text-black dark:hover:text-white transition-colors"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M6 4L10 8L6 12"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* carousel */}
        <div
          ref={trackRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          className="flex gap-6 sm:gap-8 md:gap-15 mt-8 sm:mt-10 w-full max-w-full overflow-x-auto overscroll-x-contain touch-pan-y cursor-grab active:cursor-grabbing select-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden snap-x snap-mandatory scroll-smooth"
        >
          {defaultData.map((post, index) => (
            <article
              data-card
              className="flex flex-col min-w-0 w-[clamp(190px,60vw,280px)] shrink-0 snap-start"
              key={`the-evidence-${index}`}
            >
              <div className="overflow-hidden rounded group">
                <img
                  draggable="false"
                  src={post.imageUrl}
                  className="w-full aspect-square object-cover rounded transition-transform duration-500 group-hover:scale-105"
                  alt={post.title}
                />
              </div>
              <h3 className="mt-4 sm:mt-5 text-[16px] sm:text-[17px] md:text-[18px] font-normal leading-snug dark:text-white">
                {post.title}
              </h3>
              <div className="justify-between flex text-[13px] sm:text-[14px] mt-4 sm:mt-5 text-[#73736F] dark:text-brand-gray gap-3">
                <span className="truncate">{post.author}</span>
                <span className="shrink-0">{post.date}</span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Carousel;