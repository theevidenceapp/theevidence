import React, { useEffect, useRef } from 'react'

import worldMap from '../assets/world-map.png'

const HeroSection = () => {
    const headingRef = useRef<HTMLDivElement>(null)
    const subTextRef = useRef<HTMLDivElement>(null)
    const buttonsRef = useRef<HTMLDivElement>(null)
    const mapRef = useRef<HTMLImageElement>(null)

    useEffect(() => {
        let ctx: any

        const initAnimation = async () => {
            const { default: gsap } = await import('gsap')

            ctx = gsap.context(() => {
                const tl = gsap.timeline({
                    defaults: {
                        ease: 'power3.out',
                    },
                })

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
                        '-=0.6'
                    )
                    .from(
                        buttonsRef.current?.children ?? [],
                        {
                            y: 20,
                            opacity: 0,
                            duration: 0.6,
                            stagger: 0.1,
                        },
                        '-=0.4'
                    )
                    .from(
                        mapRef.current,
                        {
                            y: 60,
                            opacity: 0,
                            duration: 1.2,
                            ease: 'power2.out',
                        },
                        '-=0.3'
                    )
            })
        }

        initAnimation()

        return () => {
            ctx?.revert()
        }
    }, [])

    return (
        <div className="bg-white dark:bg-brand-dark">
            <div>
                <div className="mt-[231px] flex flex-col gap-2 text-center">
                    <div
                        ref={headingRef}
                        className="flex justify-center gap-2"
                    >
                        <h1 className="font-medium text-[64px] text-black dark:text-white">
                            Research, thoughtfully brought to
                        </h1>

                        <span className="font-extralight text-[64px] italic font-literata text-black dark:text-white">
                            light
                        </span>
                    </div>

                    <div
                        ref={subTextRef}
                        className="text-[20px] font-normal font-extralight text-black/70 dark:text-white/70"
                    >
                        A considered home for research—written with care, reviewed with rigor,
                        <br />
                        and published for everyone to read.
                    </div>
                </div>

                <div
                    ref={buttonsRef}
                    className="mt-15 flex justify-center gap-15"
                >
                    <button className="rounded-full bg-brand-primary px-8 py-4 text-white dark:bg-brand-primary dark:text-white">
                        Be a researcher
                    </button>

                    <button className="rounded-full bg-brand-gray px-8 py-4 text-white dark:bg-brand-gray dark:text-white">
                        Explore researches
                    </button>
                </div>
            </div>

            <div className="flex justify-center">
                <img
                    ref={mapRef}
                    className="h-auto w-360 dark:opacity-90 dark:invert-0"
                    src={worldMap.src}
                    alt="World map"
                />
            </div>
        </div>
    )
}

export default HeroSection