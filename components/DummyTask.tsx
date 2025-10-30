import React, { useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { Page } from '../types';
import { ChevronLeftIcon } from './icons';

interface PlaceholderTaskProps {
  taskId: string;
  title: string;
  instructions: string[];
}

const PlaceholderTask: React.FC<PlaceholderTaskProps> = ({ taskId, title, instructions }) => {
  // FIX: Renamed 'updateTaskProgress' to 'updateTaskCompletion' to match AppContext provider.
  const { setCurrentPage, updateTaskCompletion, t } = useContext(AppContext);

  const handleComplete = () => {
    // FIX: Called 'updateTaskCompletion' with the required 'score' argument, defaulting to 0.
    updateTaskCompletion(taskId, 1, 0); // Mark as 1/1 step completed
    setCurrentPage(Page.DASHBOARD);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 pt-24 text-center animate-fade-in">
       <button 
        onClick={() => setCurrentPage(Page.DASHBOARD)} 
        className="absolute top-20 left-4 sm:left-6 lg:left-8 flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-red-500 transition-colors"
      >
        <ChevronLeftIcon className="w-6 h-6"/>
        Back to Dashboard
      </button>

      <div className="w-full max-w-2xl">
        <h1 className="text-4xl font-bold mb-4">{title}</h1>
        <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-lg p-8 rounded-2xl shadow-xl text-left mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-4 text-center">Instructions</h2>
            <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
                {instructions.map((inst, index) => <li key={index}>{inst}</li>)}
            </ul>
        </div>
    <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-lg p-8 rounded-2xl shadow-xl">
      <h2 className="text-2xl font-semibold text-gray-700 dark:text-gray-300">{t('coming_soon')}</h2>
      <p className="mt-4 text-gray-600 dark:text-gray-400">
        {t('placeholder_dev_line1')}
        {' '}
        {t('placeholder_dev_line2')}
      </p>
    </div>
    <button 
      onClick={handleComplete} 
      className="mt-8 px-8 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors"
    >
      {t('mark_as_complete')}
    </button>
      </div>
    </div>
  );
};

export default PlaceholderTask;