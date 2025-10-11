
import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

interface HeaderProps {
    bannerSrc: string;
}

const Header: React.FC<HeaderProps> = ({ bannerSrc }) => {
    const headerRef = useRef(null);
    const headerInView = useInView(headerRef, { once: true });

    return (
        <header className="text-center" ref={headerRef}>
            <motion.h1
                className="text-3xl md:text-4xl font-bold text-blue-900 mb-6 px-2"
                initial={{ opacity: 0, y: -50 }}
                animate={headerInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.8 }}
            >
                Welcome to Quality Month Celebration – November 2025!
            </motion.h1>
            <motion.div
                className="w-full overflow-hidden rounded-lg shadow-lg"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={headerInView ? { opacity: 1, scale: 1 } : {}}
                transition={{ duration: 1, delay: 0.2 }}
            >
                <img src={bannerSrc} alt="Quality Month Banner" className="w-full h-auto object-cover" />
            </motion.div>
        </header>
    );
};

export default Header;
