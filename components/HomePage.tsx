
import React, { useContext, useState, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import { Page } from '../types';
import Header from './Header';
import Content from './Content';
import bannerImg from '../assets/banner.jpg';
import themeLogoImg from '../assets/theme logo.png';

const HomePage: React.FC = () => {
  const { setCurrentPage } = useContext(AppContext);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger fade-in animation after component mounts
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={`transition-opacity duration-1000 ease-in ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 max-w-5xl">
        <Header bannerSrc={bannerImg} />
        <div className="bg-white shadow-xl rounded-lg p-6 md:p-12 mt-6 z-10 relative">
          <Content themeLogoSrc={themeLogoImg} onGetStarted={() => setCurrentPage(Page.LOGIN)} />
        </div>
        <footer className="text-center mt-8 text-gray-500 text-sm">
          <p>&copy; 2025 Toyota Industries Engine India Pvt. Ltd. All Rights Reserved.</p>
        </footer>
      </main>
    </div>
  );
};

export default HomePage;