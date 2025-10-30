import React, { useContext, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AppContext } from "../context/AppContext";
import { XCircleIcon } from "./icons";

interface ScoreData {
  name: string;
  department: string;
  score: number;
}

const Spinner: React.FC = () => (
  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
);

const TopScoresModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { getTopScores } = useContext(AppContext);
  const [scores, setScores] = useState<ScoreData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // no department passed -> top across all departments (default behavior)
    getTopScores().then((data) => {
      setScores(data);
      setLoading(false);
    });
  }, [getTopScores]);

  const medalColors = ["text-yellow-400", "text-gray-400", "text-yellow-600"];

  const modal = (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      style={{ zIndex: 99999 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 text-center transform transition-all scale-95 opacity-0 animate-fade-in"
        style={{
          animationDelay: "100ms",
          animationFillMode: "forwards",
          animationName: "zoomIn",
        }}
      >
        <style>{`@keyframes zoomIn { to { transform: scale(1); opacity: 1; } }`}</style>
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-red-500"
        >
          <XCircleIcon className="w-8 h-8" />
        </button>

        <h2 className="text-3xl font-extrabold text-gray-900 mb-6">
          Top Performers
        </h2>

        {loading ? (
          <div className="flex justify-center items-center h-48">
            <Spinner />
          </div>
        ) : scores.length > 0 ? (
          <ul className="space-y-4 text-left">
            {scores.map((user, index) => (
              <li
                key={index}
                className="flex items-center p-4 bg-gray-100 rounded-lg shadow-sm"
              >
                <div
                  className={`w-10 h-10 flex-shrink-0 flex items-center justify-center font-bold text-xl ${
                    medalColors[index] || "text-gray-500"
                  }`}
                >
                  {index < 3 ? "●" : `#${index + 1}`}
                </div>
                <div className="ml-4 flex-grow">
                  <p className="font-bold text-lg text-gray-800">{user.name}</p>
                  <p className="text-sm text-gray-500">{user.department}</p>
                </div>
                <div className="text-2xl font-black text-red-500">
                  {user.score}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500 h-48 flex items-center justify-center">
            No scores recorded yet. Be the first!
          </p>
        )}
      </div>
    </div>
  );

  return createPortal(modal, document.body);
};

export default TopScoresModal;
