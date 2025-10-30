import React, { useContext, useEffect, useState } from "react";
import { AppContext } from "../context/AppContext";
import { Page } from "../types";
import EventCard from "./EventCard";
import CongratulationsModal from "./CongratulationsModal";
import TopScoresModal from "./TopScoresModal";
import KnowledgeCentreModal from "./KnowledgeCentreModel";

const Dashboard: React.FC = () => {
  const { tasks } = useContext(AppContext);
  const [showCongrats, setShowCongrats] = useState(false);
  const [showTopScores, setShowTopScores] = useState(false);
  const [showKnowledgeCentre, setShowKnowledgeCentre] = useState(false);
  const { setCurrentPage } = useContext(AppContext);

  const allTasksCompleted = tasks.every(
    (task) => task.completedSteps === task.totalSteps
  );

  useEffect(() => {
    if (allTasksCompleted) {
      const timer = setTimeout(() => setShowCongrats(true), 500);
      return () => clearTimeout(timer);
    }
  }, [allTasksCompleted]);

  const { t, language } = useContext(AppContext);

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-24 animate-fade-in">
      <header className="text-center mb-12">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 tracking-tight">
          {language === "kn"
            ? "2025 - ಗುಣಮಟ್ಟ ತಿಂಗಳ ಇವೆಂಟ್ ಪೋರ್ಟಲ್‌ಗೆ ಸ್ವಾಗತ"
            : "Welcome to Quality Month - 2025 Event Portal"}
        </h1>
        <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
          {language === "kn"
            ? "ಅಂಕಗಳನ್ನು ಗಳಿಸಲು ಮತ್ತು ಸ್ಪರ್ಧಿಸಲು ಎಲ್ಲಾ ಮಾದರಿಗಳನ್ನು ಪೂರ್ಣಗೊಳಿಸಿ!."
            : "Complete the modules below to earn your points and compete."}
        </p>
        <div className="mt-6 flex justify-center items-center gap-4">
          <button
            onClick={() => setCurrentPage(Page.TOP_PERFORMERS)}
            className="px-6 py-2 bg-red-600 text-white font-semibold rounded-full transform hover:scale-105 transition-transform duration-200 ease-in-out shadow-md"
          >
            {t("view_top_scores")}
          </button>
          <button
            onClick={() => setCurrentPage(Page.KNOWLEDGE_CENTRE)}
            className="px-6 py-2 bg-white border border-gray-200 text-gray-800 font-semibold rounded-full transform hover:scale-105 transition-transform duration-200 ease-in-out shadow-sm"
          >
            {t("knowledge_centre")}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {tasks.map((task, index) => (
          <div
            key={task.id}
            style={{ animationDelay: `${index * 100}ms` }}
            className="animate-fade-in"
          >
            <EventCard task={task} />
          </div>
        ))}
      </div>

      {showCongrats && (
        <CongratulationsModal onClose={() => setShowCongrats(false)} />
      )}
      {/* Top performers and Knowledge Centre now have dedicated pages */}
    </div>
  );
};

export default Dashboard;
