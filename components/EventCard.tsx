
import React, { useContext } from 'react';
import { Task } from '../types';
import { AppContext } from '../context/AppContext';
import { CheckCircleIcon } from './icons';

interface ProgressBarProps {
    progress: number;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ progress }) => (
    <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div
            className="bg-red-600 h-2.5 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
        ></div>
    </div>
);


interface EventCardProps {
  task: Task;
}

const EventCard: React.FC<EventCardProps> = ({ task }) => {
  const { setCurrentPage, t, language } = useContext(AppContext);
  const progress = (task.completedSteps / task.totalSteps) * 100;
  const isCompleted = progress === 100;
  const iconNumber: Record<string, number> = {
    task1: 1, task6: 2, task3: 3, task4: 4, task8: 5, task7: 6, task9: 7,
  };
  const [iconLoaded, setIconLoaded] = React.useState(false);

  return (
    <div
      onClick={() => !isCompleted && setCurrentPage(task.page)}
      className={`group relative p-6 rounded-2xl shadow-lg h-full flex flex-col justify-between transition-all duration-300 ease-in-out transform hover:-translate-y-2
        ${isCompleted
          ? 'bg-green-100/50 cursor-default'
          : 'bg-white/50 backdrop-blur-lg hover:shadow-2xl cursor-pointer'}`
      }
    >
      <div>
        <div className="relative mb-4 h-28 flex items-center justify-center">
          {!iconLoaded && <div className="absolute h-10 w-10 animate-spin rounded-full border-4 border-red-200 border-t-red-600" aria-label="Loading competition image" />}
          <img
            src={`/${iconNumber[task.id]}.svg`}
            alt=""
            onLoad={() => setIconLoaded(true)}
            className={`h-28 w-28 object-contain transition-opacity ${iconLoaded ? 'opacity-100' : 'opacity-0'}`}
          />
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <h3 className="text-xl font-bold text-gray-800 pr-2">
            {language === 'kn' ? (task.titleKn || task.title) : task.title}
          </h3>
          <span className="flex-shrink-0 self-start bg-red-100 text-red-800 text-xs font-bold px-2.5 py-1 rounded-full">
            {`Max Points:${task.maxScore} ${language === 'en' ? '' : t('points_label')}`}
          </span>
        </div>
        <p className="mt-2 text-sm text-gray-600">
          {language === 'kn' ? (task.descriptionKn || task.description) : task.description}
        </p>
      </div>

      <div className="mt-6">
        <div className="flex justify-between items-center mb-2 text-sm font-medium text-gray-600">
          <span>{t('progress_label')}</span>
          <span>{task.completedSteps} / {task.totalSteps}</span>
        </div>
        {isCompleted ? (
      <div className="flex items-center gap-2 text-green-600">
        <CheckCircleIcon className="w-6 h-6" />
        <span className="font-bold">{t('completed')}</span>
      </div>
        ) : (
            <ProgressBar progress={progress} />
        )}
      </div>

      {!isCompleted && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity duration-300">
            <span className="text-white text-lg font-bold">{t('start_task')}</span>
        </div>
      )}
    </div>
  );
};

export default EventCard;
