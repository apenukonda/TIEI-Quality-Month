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
import TopPerformers from './components/TopPerformers';
import KnowledgeCentrePage from './components/KnowledgeCentrePage';
import KnFontScaler from './components/KnFontScaler';
import Admin from './components/admin/Admin';
import KaizenSuggestionTask from './components/KaizenSuggestionTask';

const App: React.FC = () => {
  const { currentPage, theme, currentUser } = useContext(AppContext);
  const { language } = useContext(AppContext);

  // determine if the current render is the admin view so we can hide the global navbar
  const isAdminUser = currentUser && (currentUser.role === 'admin' || currentUser.role === 'ADMIN');
  const pathnameIsAdmin = typeof window !== 'undefined' && window.location.pathname === '/admin';
  const isAdminView = Boolean(isAdminUser && (currentPage === Page.DASHBOARD || pathnameIsAdmin));

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
      return <ImageSubmissionTask />;
    case Page.SLOGAN_WRITER:
      return <PlaceholderTask
          taskId="task4" 
          title="Slogan Competition" 
          instructions={[
            "The slogan should be related to Quality.",
            "Slogans are accepted in both Kannada and English.",
            "A unique slogan is preferred for prize selection.",
            "Upon submission, 3 points will be added to your account for overall evaluation.",
            "This category will have a separate Top-3 special recognition."
          ]}
          score={3}
         />;
    case Page.SUGGESTION_BOX:
      return <PlaceholderTask
          taskId="task5"
          title="Kaizen Suggestion"
          instructions={[
            "Click the “Open Microsoft Form” button to participate in the contest.",
            "Once you click the link, you will be redirected to the Microsoft Form.",
            "Read the instructions on the Microsoft Form carefully.",
            "After submitting the Microsoft Form, click the “Mark as Complete” button to receive your completion score.",
            "Once you click “Mark as Complete,” you will not be able to participate in the contest again.",
            "Upon submission, 3 points will be added to your account for overall evaluation.",
            "This category will also have a separate Top-3 special recognition.",
            "If you have more than one suggestion for the Kaizen suggestion, they are also accepted. For this, please contact Mr. Ashwin – 8904799083, Quality Department."
          ]}
          score={3}
         />;
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
      <div className="bg-white text-gray-900 min-h-screen">
        {/* Global Kannada font-size scaler */}
        <KnFontScaler enabled={language === 'kn'} />
  {currentUser && !isAdminView && <Navbar />}
        <main>{renderPage()}</main>
      </div>
    </div>
  );
};

export default App;
