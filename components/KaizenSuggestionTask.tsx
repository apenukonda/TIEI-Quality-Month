import React, { useContext } from 'react';
import { AppContext } from '../context/AppContext';

const KaizenSuggestionTask: React.FC = () => {
  const { updateTaskCompletion } = useContext(AppContext);

  const handleOpenGoogleForm = () => {
    // Replace with the actual Google Form URL
    window.open('https://forms.office.com/r/vJ2dA7FUGW', '_blank');
  };

  const handleSubmit = () => {
    // Award 3 points for this task
    updateTaskCompletion('task5', 1, 3);
  };

  return (
    <div className="px-4 sm:px-8">
      {/* Add responsive top margin so title doesn't collide with absolute Back button on small screens */}
      <h2 className="text-2xl font-semibold mt-10 sm:mt-0">Kaizen Suggestion</h2>
      <p className="mt-4">Share your ideas for continuous improvement (Kaizen).</p>

      <div className="mt-6 flex flex-col gap-3 max-w-xl">
        <button
          className="bg-blue-600 text-white py-2 px-4 rounded"
          onClick={handleOpenGoogleForm}
        >
          Open Microsoft Form
        </button>

        <button
          className="bg-green-600 text-white py-2 px-4 rounded"
          onClick={handleSubmit}
        >
          Submit
        </button>
      </div>
    </div>
  );
};

export default KaizenSuggestionTask;