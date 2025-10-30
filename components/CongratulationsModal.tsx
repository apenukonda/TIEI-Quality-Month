import React from "react";
import { createPortal } from "react-dom";
import { CheckCircleIcon } from "./icons";

interface CongratulationsModalProps {
  onClose: () => void;
}

const CongratulationsModal: React.FC<CongratulationsModalProps> = ({
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
        className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8 text-center transform transition-all scale-95 opacity-0 animate-fade-in"
        style={{
          animationDelay: "200ms",
          animationFillMode: "forwards",
          animationName: "zoomIn",
        }}
      >
        <style>
          {`
            @keyframes zoomIn {
                to {
                    transform: scale(1);
                    opacity: 1;
                }
            }
            `}
        </style>
        <div className="mx-auto w-24 h-24 flex items-center justify-center rounded-full bg-green-100 mb-6">
          <CheckCircleIcon className="w-16 h-16 text-green-500" />
        </div>
        <h2 className="text-3xl font-extrabold text-gray-900">
          Congratulations!
        </h2>
        <p className="mt-4 text-lg text-gray-600">
          You have successfully completed all Quality Month Event tasks.
        </p>
        <p className="mt-2 text-sm text-gray-500">
          Your commitment to quality and continuous improvement is what drives
          Toyota forward.
        </p>
        <div className="mt-8 flex justify-center">
          <button
            onClick={onClose}
            className="px-8 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
};

export default CongratulationsModal;
