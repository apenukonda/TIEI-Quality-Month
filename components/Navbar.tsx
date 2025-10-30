import React, { useContext, useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { AppContext } from "../context/AppContext";
import { Page } from "../types";
import { HomeIcon } from "./icons";

// Modern profile menu with better visuals and accessibility
const ProfileMenu: React.FC<{ initials: string }> = ({ initials }) => {
  const { currentUser, language, setLanguage, logout, t } =
    useContext(AppContext);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
   const [showWelcomeVideo, setShowWelcomeVideo] = useState(false);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  useEffect(() => {
    // when opened, focus first actionable element for keyboard users
    if (open && panelRef.current) {
      const first =
        panelRef.current.querySelector<HTMLButtonElement>("button, a");
      first?.focus();
    }
  }, [open]);

  const handleToggle = () => setOpen((v) => !v);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleToggle}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Open profile menu"
        className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center text-white font-semibold text-sm border border-white/10 shadow-sm hover:scale-105 transform transition-transform"
      >
        {initials}
      </button>

      {open && (
        <div
          ref={panelRef}
          role="menu"
          aria-orientation="vertical"
          className="absolute right-0 mt-3 w-64 bg-white rounded-xl shadow-2xl z-50 ring-1 ring-black/5 overflow-hidden transform transition duration-150 ease-out origin-top-right"
          style={{ boxShadow: "0 8px 30px rgba(2,6,23,0.2)" }}
        >
          <div className="p-4 flex items-center gap-5 border-b border-gray-200">
            <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center text-white font-bold text-sm">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-gray-900 truncate">
                {currentUser?.name || t("user")}
              </div>
              <div className="text-xs text-gray-600 truncate">
                {currentUser?.email ||
                  currentUser?.designation ||
                  currentUser?.department ||
                  ""}
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowWelcomeVideo(true)}
            className="flex items-center gap-2 text-gray-800 dark:text-red-600 hover:text-red-600 dark:hover:text-red-500 transition-colors px-2 py-1 rounded"
          >
            Watch Tutorial
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="red"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path
                d="M5 3v18l15-9L5 3z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
           
          </button>
                {showWelcomeVideo &&
        createPortal(
          <div
            onClick={() => setShowWelcomeVideo(false)}
            className="fixed inset-0 bg-black/70 flex items-center justify-center p-4"
            style={{ zIndex: 99999 }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-black rounded-lg w-full max-w-3xl relative shadow-2xl overflow-hidden"
            >
              {/* Header area: contains title / close button, outside the video container so it doesn't overlap the video */}
              <div className="flex items-center justify-between px-4 py-3 bg-black/80">
                <div className="text-white text-sm font-medium">Welcome</div>
                <div>
                  <button
                    onClick={() => setShowWelcomeVideo(false)}
                    aria-label="Close video"
                    className="text-white bg-white/10 hover:bg-white/20 rounded-md px-3 py-1 text-sm"
                  >
                    Close
                  </button>
                </div>
              </div>
              <div className="p-4 bg-black">
                <div className="w-full h-auto rounded-lg max-h-[80vh] overflow-hidden">
                  <video
                    src="/welcome.mp4"
                    controls
                    autoPlay
                    playsInline
                    className="w-full h-auto bg-black"
                  />
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

          <div className="p-2">
            {/* Language selector (English / Kannada) */}
            <div className="px-1 py-2">
              <div className="text-xs text-gray-600 px-1 pb-2">Language</div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setLanguage("en");
                    setOpen(false);
                  }}
                  role="menuitem"
                  className={`flex-1 py-2 rounded text-sm ${
                    language === "en"
                      ? "bg-gray-900 text-white"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  English
                </button>
                <button
                  onClick={() => {
                    setLanguage("kn");
                    setOpen(false);
                  }}
                  role="menuitem"
                  className={`flex-1 py-2 rounded text-sm ${
                    language === "kn"
                      ? "bg-gray-900 text-white"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  Kannada
                </button>
              </div>
            </div>

            <div className="my-2 border-t border-gray-200"></div>

            <a
              href={`https://wa.me/7975398660`}
              target="_blank"
              rel="noopener noreferrer"
              role="menuitem"
              className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-100 focus:outline-none transition"
            >
              <svg
                className="w-4 h-4 text-green-600"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 12.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.7-4.7A8.38 8.38 0 013.8 12.5 8.5 8.5 0 018 4a8.38 8.38 0 013.8-.9h.2A8.5 8.5 0 0121 12.5z"
                />
              </svg>
              <span className="text-sm text-gray-800">
                {t("Contact Us") || "Contact"}
              </span>
            </a>

            <button
              onClick={() => {
                logout();
                setOpen(false);
              }}
              role="menuitem"
              className="w-full mt-2 flex items-center gap-3 px-3 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 focus:outline-none transition"
            >
              <svg
                className="w-4 h-4 text-white"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17 16l4-4m0 0l-4-4m4 4H7"
                />
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 8v8" />
              </svg>
              <span className="text-sm">{t("logout") || "Logout"}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const Navbar: React.FC = () => {
  const { currentUser, logout, setCurrentPage, t, language, setLanguage } =
    useContext(AppContext);
  const initials = currentUser?.name
    ? currentUser.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "U";
 

  return (
    <header className="fixed top-0 left-0 right-0 bg-white/80 dark:bg-gray-900/75 backdrop-blur-md shadow-sm z-50 animate-fade-in">
      <div className="container mx-auto px-6 py-3 flex justify-between items-center">
        <div className="flex items-center space-x-6">
          <button
            onClick={() => setCurrentPage(Page.DASHBOARD)}
            className="flex items-center gap-2 text-gray-800 dark:text-white hover:text-red-600 dark:hover:text-red-500 transition-colors"
          >
            <HomeIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <img
            src="/company-logo.png"
            alt="company-logo"
            className="h-8 text-red-600 dark:text-red-500 hidden md:block"
          />
        </div>

        <div className="flex items-center space-x-3">
          {/* <button
            onClick={() => setShowWelcomeVideo(true)}
            className="flex items-center gap-2 text-gray-800 dark:text-white hover:text-red-600 dark:hover:text-red-500 transition-colors px-2 py-1 rounded"
          >
            Watch Tutorial
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path
                d="M5 3v18l15-9L5 3z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
           
          </button> */}
          {/* score display left of avatar for desktop */}
          <div className="hidden sm:flex flex-col items-end mr-2 text-right">
            <span className="text-sm text-gray-600 dark:text-gray-300">
              {t("score")}
            </span>
            <span className="text-lg font-bold text-gray-900 dark:text-white">
              {currentUser?.score ?? 0}
            </span>
          </div>

          {/* compact mobile score badge visible only on small screens */}
          <div aria-hidden={true} className="sm:hidden flex items-center mr-2">
            <div className="flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
              <span className="text-[10px] text-gray-600 dark:text-gray-300 leading-none">
                {t("score")}
              </span>
              <span className="text-sm font-semibold">
                {currentUser?.score ?? 0}
              </span>
            </div>
          </div>

          <ProfileMenu initials={initials} />
        </div>
      </div>
    </header>
  );
};

export default Navbar;

// Small self-contained language dropdown component
const LanguageDropdown: React.FC = () => {
  const { language, setLanguage } = useContext(AppContext);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  const select = (lang: "en" | "kn") => {
    setLanguage(lang);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative text-right">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 bg-gray-900 border border-white/20 text-white text-sm px-3 py-1 rounded hover:bg-gray-800 transition-colors"
      >
        {language === "kn" ? "Kannada" : "English"}
        <svg
          className={`w-3 h-3 transform transition-transform ${
            open ? "-rotate-180" : ""
          }`}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-40 bg-black border border-white/10 rounded shadow-lg z-50 py-1">
          <button
            onClick={() => select("en")}
            className={`w-full text-left px-3 py-2 text-white hover:bg-gray-800 ${
              language === "en" ? "bg-gray-800" : ""
            }`}
          >
            English
          </button>
          <button
            onClick={() => select("kn")}
            className={`w-full text-left px-3 py-2 text-white hover:bg-gray-800 ${
              language === "kn" ? "bg-gray-800" : ""
            }`}
          >
            Kannada
          </button>
        </div>
      )}
    </div>
  );
};
