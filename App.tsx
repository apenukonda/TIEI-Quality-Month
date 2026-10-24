import React, { useContext, useEffect } from 'react';
import { AppContext } from './context/AppContext';
import { Page } from './types';
import HomePage from './components/HomePage';
import AuthPage from './components/AuthPage';
import Dashboard from './components/Dashboard';
import Navbar from './components/Navbar';
import MdMessageTask from './components/MdMessageTask';
import PlaceholderTask from './components/PlaceholderTask';
import VideoTask from './components/VideoTask';
import ImageSubmissionTask from './components/ImageSubmissionTask';
import DummyCompetitionTask from './components/DummyCompetitionTask';
import TopPerformers from './components/TopPerformers';
import KnowledgeCentrePage from './components/KnowledgeCentrePage';
import KnFontScaler from './components/KnFontScaler';
import Admin from './components/admin/Admin';
import logoImg from './assets/logo.png';

const App: React.FC = () => {
  const { currentPage, theme, currentUser } = useContext(AppContext);
  const { language, t } = useContext(AppContext);

  // determine if the current render is the admin view so we can hide the global navbar
  const isAdminUser = currentUser && (currentUser.role === 'admin' || currentUser.role === 'ADMIN');
  const pathnameIsAdmin = typeof window !== 'undefined' && window.location.pathname === '/admin';
  const isAdminView = Boolean(isAdminUser && (currentPage === Page.DASHBOARD || pathnameIsAdmin));
  const showWatermark = currentPage !== Page.LOGIN && currentPage !== Page.SIGNUP;

  const renderPage = () => {
    const isAdmin = isAdminUser;

    // If user directly navigates to /admin, handle it first
    if (pathnameIsAdmin) {
      if (isAdmin) return <Admin />;
      // non-admin trying to access /admin -> fall back to home
      return <HomePage />;
    }
    switch (currentPage) {
      case Page.LOGIN:
      case Page.SIGNUP:
        return <AuthPage />;
      case Page.DASHBOARD:
        // if the logged in user has an admin role, show the admin landing
        if (isAdmin) {
          return <Admin />;
        }
        return <Dashboard />;
      case Page.MD_MESSAGE:
        return <MdMessageTask />;
      case Page.TOP_PERFORMERS:
        return <TopPerformers />;
      case Page.KNOWLEDGE_CENTRE:
        return <KnowledgeCentrePage />;
      case Page.VIDEO_TASK:
        return <VideoTask />;
    case Page.IMAGE_SUBMISSION:
      return <ImageSubmissionTask taskId="task3" title={t('Craft your Vision')} />;
    case Page.QUALITY_COMICS:
      return <ImageSubmissionTask taskId="task7" title={t('Quality comics')} showComicInstructions />;
    case Page.SLOGAN_WRITER:
      return <PlaceholderTask
          taskId="task4" 
          title={t('Quality mantra')}
          instructions={[
            "The slogan should be related to Quality.",
            "Slogans are accepted in both Kannada and English.",
            "A unique slogan is preferred for prize selection.",
            "Upon submission, 3 points will be added to your account for overall evaluation.",
            "This category will have a separate Top-3 special recognition."
          ]}
          score={3}
         />;
    case Page.BRAIN_BLITZ:
      return <DummyCompetitionTask taskId="task8" title={t('Brain blitz')} />;
    case Page.BEYOND_THE_BLUEPRINT:
      return <DummyCompetitionTask taskId="task9" title={t('Beyond the blueprint')} />;
      case Page.HOME:
      default:
        return <HomePage />;
    }
  };

  // Keep the browser URL in sync: if an admin is viewing dashboard, push /admin.
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (isAdminUser && (currentPage === Page.DASHBOARD || window.location.pathname === '/admin')) {
      if (window.location.pathname !== '/admin') {
        window.history.replaceState(null, '', '/admin');
      }
    } else {
      // if a non-admin is on /admin, push them to home
      if (window.location.pathname === '/admin' && !isAdminUser) {
        window.history.replaceState(null, '', '/');
      }
    }
  }, [isAdminUser, currentPage]);

  return (
    <div className={`${theme} transition-colors duration-500`}>
      <div className="relative bg-white text-gray-900 min-h-screen">
        {showWatermark && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center overflow-hidden"
          >
            <img
              src={logoImg}
              alt=""
              className="w-[min(82vw,760px)] max-h-[82vh] object-contain opacity-[0.055]"
            />
          </div>
        )}
        {/* Global Kannada font-size scaler */}
        <KnFontScaler enabled={language === 'kn'} />
  {currentUser && !isAdminView && <Navbar />}
        <main className="relative z-10">{renderPage()}</main>
      </div>
    </div>
  );
};

export default App;
