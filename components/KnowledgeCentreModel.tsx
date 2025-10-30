import React from "react";
import { createPortal } from "react-dom";
import { ADVANCED_MODULES } from "../constants";
import { XCircleIcon } from "./icons";

interface KnowledgeCentreModalProps {
  onClose: () => void;
}

const KnowledgeCentreModal: React.FC<KnowledgeCentreModalProps> = ({
  onClose,
}) => {
  const modal = (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      style={{ zIndex: 99999 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full text-center transform transition-all scale-95 opacity-0 animate-fade-in"
        style={{ animationDelay: "100ms", animationFillMode: "forwards" }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-red-500 z-10"
        >
          <XCircleIcon className="w-8 h-8" />
        </button>

        <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white pt-6 pb-4 border-b border-gray-200 dark:border-gray-700">
          Knowledge Centre
        </h2>

        <div className="p-6 max-h-[70vh] overflow-y-auto">
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Explore these resources to deepen your understanding of Toyota's
            core principles.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
            {ADVANCED_MODULES.flatMap((module) => module.videos).map(
              (video) => (
                <a
                  key={video.id}
                  href={`https://www.youtube.com/watch?v=${video.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block bg-gray-100 dark:bg-gray-900/50 rounded-lg overflow-hidden shadow-sm hover:shadow-lg hover:scale-[1.02] transition-all duration-300"
                >
                  <img
                    src={`https://img.youtube.com/vi/${video.id}/mqdefault.jpg`}
                    alt={video.title}
                    className="w-full h-32 object-cover"
                  />
                  <div className="p-3">
                    <p className="font-semibold text-sm text-gray-800 dark:text-white group-hover:text-red-500 transition-colors">
                      {video.title}
                    </p>
                  </div>
                </a>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
};

export default KnowledgeCentreModal;
