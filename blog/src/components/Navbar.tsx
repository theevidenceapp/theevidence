import React from 'react'
import darkLogo from "../assets/dark-logo.png"

const Navbar = () => {
    return (
        <div className='flex justify-center'>
            <div className='border border-gray-400 dark:border-gray-700 w-299.75 h-17.5 rounded-full mt-10 flex justify-between items-center bg-white dark:bg-brand-dark z-10'>
                <img className='w-20 h-12.25 ml-6.25 block dark:hidden' src="https://pub-d65f9d792dba44cfb4b36fdd1925ed72.r2.dev/theevidence.png" draggable='false' alt="the evidence" />
                <img className='w-20 h-12.25 ml-6.25 hidden dark:block' src={darkLogo.src} draggable='false' alt="the evidence" />
                <div className='mr-6'>
                    <ul className='flex gap-8 items-center'>
                        <li className='text-gray-800 dark:text-gray-200'>Home</li>
                        <li className='text-gray-800 dark:text-gray-200'>About</li>
                        <li className='bg-brand-primary text-white px-8 py-4 rounded-full'>Be a researcher</li>
                    </ul>
                </div>
            </div>
        </div>
    )
}

export default Navbar