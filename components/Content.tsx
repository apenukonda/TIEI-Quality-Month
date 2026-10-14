import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
// import companyLogo from '../assets/company-logo.png';

// A reusable section component to keep styling consistent and add animation
const Section: React.FC<{ title?: string; children: React.ReactNode; className?: string }> = ({ title, children, className = '' }) => (
    <section className={`mb-10 text-center ${className}`}>
        {title && <h2 className="text-xl md:text-2xl font-bold text-blue-800 mb-4">{title}</h2>}
        {children}
    </section>
);

// Variants for staggered list animations
const listContainerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.3
        }
    }
};

const listItemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.5 } }
};

// A reusable list item component for the "Why Participate?" section
const ListItem: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <motion.p className="text-base md:text-lg text-gray-700 mb-2 flex items-start text-left" variants={listItemVariants}>
        <span className="text-blue-600 font-bold mr-3 text-2xl leading-none">{'>'}</span>
        <span>{children}</span>
    </motion.p>
);

interface ContentProps {
    themeLogoSrc: string;
    onGetStarted: () => void;
}

const Content: React.FC<ContentProps> = ({ themeLogoSrc, onGetStarted }) => {

    const introRef = useRef(null);
    const introInView = useInView(introRef, { once: true });
    const themeRef = useRef(null);
    const themeInView = useInView(themeRef, { once: true });
    const encouragementRef = useRef(null);
    const encouragementInView = useInView(encouragementRef, { once: true });
    const wakuRef = useRef(null);
    const wakuInView = useInView(wakuRef, { once: true });
    const whyRef = useRef(null);
    const whyInView = useInView(whyRef, { once: true });
    const ctaRef = useRef(null);
    const ctaInView = useInView(ctaRef, { once: true });

    return (
    <div className="space-y-8">
            {/* Introduction */}
            
            <motion.div ref={introRef} initial={{ opacity: 0, y: 50 }} animate={introInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.8 }}>
                <Section>
                    <p className="text-base md:text-lg text-gray-700 text-center leading-relaxed mb-4">
                        Welcome to the official platform for celebrating <strong>Quality Month</strong> at <strong>Toyota Industries Engine India Pvt. Ltd.</strong> This is your space to explore, engage, and elevate your commitment to quality through exciting competitions and activities.
                    </p>
                    <p className="text-base md:text-lg text-gray-600 leading-relaxed font-serif text-center">
                    ಟೊಯೋಟಾ ಇಂಡಸ್ಟ್ರೀಸ್ ಎಂಜಿನ್ ಇಂಡಿಯಾ ಪ್ರೈ. ಲಿಮಿಟೆಡ್‌ನಲ್ಲಿ<strong>ಗುಣಮಟ್ಟದ ತಿಂಗಳನ್ನು</strong>ಆಚರಿಸುವ ಅಧಿಕೃತ ವೇದಿಕೆಗೆ ನಿಮಗೆ ಸ್ವಾಗತ.
                    ಉತ್ಸಾಹಭರಿತ ಸ್ಪರ್ಧೆಗಳು ಮತ್ತು ಚಟುವಟಿಕೆಗಳ ಮೂಲಕ ಗುಣಮಟ್ಟಕ್ಕೆ ನಿಮ್ಮ ಬದ್ಧತೆಯನ್ನು ಅನ್ವೇಷಿಸಲು, ತೊಡಗಿಸಿಕೊಳ್ಳಲು ಮತ್ತು ಉನ್ನತೀಕರಿಸಲು ಇದು ನಿಮ್ಮ ಜಾಗವಾಗಿದೆ.
                    </p>
                </Section>
            </motion.div>

            {/* Theme */}
            <motion.div ref={themeRef} initial={{ opacity: 0, y: 50 }} animate={themeInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.8 }}>
            <Section>
  <div className="flex flex-col gap-2 items-center justify-center  bg-blue-50 p-6 rounded-xl shadow-inner">
    <img
      src="/company-logo.png"
      alt="Company Logo"
      className="w-32 h-20 m-0 object-contain order-1"
    />
    <img
      src={themeLogoSrc}
      alt="Theme Logo"
      className="w-36 h-36 sm:w-52 sm:h-52 md:w-60 md:h-60 object-contain transition-transform duration-300 hover:scale-110 hover:rotate-3 order-2"
    />
    <div className="text-center md:text-center order-3 mt-2">
      <p className="text-lg font-semibold text-blue-900">This Year's Theme:</p>
      <h3 className="text-2xl md:text-2xl font-bold text-blue-700">
        "Build Quality , Build Trust"
      </h3>
    </div>
  </div>
</Section>

            </motion.div>

            {/* Encouragement */}
            {/* <motion.div ref={encouragementRef} initial={{ opacity: 0, y: 50 }} animate={encouragementInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.8 }}>
                <Section>
                    <div className="text-lg text-gray-800  mx-auto text-left ">
                    <p className="text-xl"><strong className="text-black-700 text-left font-bold">This theme encourages us to:</strong></p>
                        <p><strong className="text-blue-700 text-left font-semibold">Think Differently</strong> – Embrace creativity and innovation.</p>
                        <p><strong className="text-orange-600 text-left font-semibold">Act Proactively</strong> – Anticipate and prevent issues before they arise.</p>
                        <p><strong className="text-green-600 text-left font-semibold">Be Preventive & Innovative</strong> – Drive continuous improvement with enthusiasm and energy.</p>
                    </div>
                </Section>
            </motion.div> */}

            {/* Waku Waku Spirit */}
            <motion.div ref={wakuRef} initial={{ opacity: 0, y: 50 }} animate={wakuInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.8 }}>
                <div className="text-center my-10 py-4">
                     <p className="text-xl md:text-2xl font-semibold text-pink-600 italic">
                         Let's embody the Waku Waku Spirit – it means "a feeling of thrill and excitement" – in everything we do!
                     </p>
                </div>
            </motion.div>

            {/* Why Participate? */}
            <motion.div ref={whyRef} initial={{ opacity: 0, y: 50 }} animate={whyInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.8 }}>
                <Section>
                    <div className="inline-block text-left bg-gray-100 p-6 rounded-lg shadow-md">
                        <h3 className="text-2xl font-bold text-red-600 mb-4 text-center">🎯 Why Participate?</h3>
                        <motion.div className="space-y-2" variants={listContainerVariants} initial="hidden" animate={whyInView ? "visible" : "hidden"}>
                            <ListItem>Showcase your ideas and solutions.</ListItem>
                            <ListItem>Collaborate and learn from peers.</ListItem>
                            <ListItem>Win recognition and exciting rewards.</ListItem>
                            <ListItem>Contribute to a culture of excellence and innovation.</ListItem>
                        </motion.div>
                    </div>
                </Section>
            </motion.div>

            {/* CTA */}
            <motion.div ref={ctaRef} initial={{ opacity: 0, y: 50 }} animate={ctaInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.8 }}>
                <Section>
                    <h3 className="text-2xl font-bold text-blue-800 mb-2">🚀 Ready to Elevate Quality?</h3>
                    <p className="text-base md:text-lg text-gray-700 mb-6  mx-auto">
                        Click the button below to begin your journey in the Quality Month competitions. Let's make this celebration impactful and inspiring!
                    </p>
                    <p className="text-base md:text-lg text-gray-700 mb-6  mx-auto">
                    ಗುಣಮಟ್ಟದ ತಿಂಗಳ ಸ್ಪರ್ಧೆಗಳಲ್ಲಿ ನಿಮ್ಮ ಪ್ರಯಾಣವನ್ನು ಪ್ರಾರಂಭಿಸಲು ಕೆಳಗಿನ ಬಟನ್ ಅನ್ನು ಕ್ಲಿಕ್ ಮಾಡಿ. ಈ ಆಚರಣೆಯನ್ನು ಪ್ರಭಾವಶಾಲಿಯಾಗಿ ಮತ್ತು ಸ್ಫೂರ್ತಿದಾಯಕವಾಗಿ ಮಾಡೋಣ!
                    </p>
                    <button onClick={onGetStarted} className="bg-red-600 text-white font-bold py-3 px-10 rounded-full text-xl shadow-lg hover:bg-red-700 transform hover:scale-105 transition-all duration-300 ease-in-out focus:outline-none focus:ring-4 focus:ring-red-300">
                        Get Started
                    </button>
                </Section>
            </motion.div>


        </div>
    );
};

export default Content;
