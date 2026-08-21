import React from 'react'

const GridBackground = () => {
    return (
        <div
            className="fixed inset-0 -z-10 h-screen w-full bg-white dark:bg-brand-dark bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-size-[64px_64px] dark:bg-[linear-gradient(to_right,#ffffff12_1px,transparent_1px),linear-gradient(to_bottom,#ffffff12_1px,transparent_1px)]"
        ></div>
    )
}

export default GridBackground;