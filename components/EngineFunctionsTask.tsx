
import React, { useState, useContext, useEffect, useRef } from 'react';
import { AppContext } from '../context/AppContext';
import { Page } from '../types';
import Quiz from './Quiz';
// FIX: Renamed imports to use constants that are actually exported from the constants file.
import { ADVANCED_VIDEOS, ADVANCED_QUIZZES } from '../constants';
import { ChevronLeftIcon, PlayIcon, CheckIcon, XCircleIcon } from './icons';

type View = 'video_list' | 'video_player' | 'quiz' | 'completed';

const EngineFunctionsTask: React.FC = () => {
  // FIX: Renamed 'updateTaskProgress' to 'updateTaskCompletion' to match the AppContext provider.
  const { setCurrentPage, updateTaskCompletion, tasks, t } = useContext(AppContext);
  const [view, setView] = useState<View>('video_list');
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [videoProgress, setVideoProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  // FIX: Renamed to use ADVANCED_VIDEOS.
  const [completedVideos, setCompletedVideos] = useState<boolean[]>(new Array(ADVANCED_VIDEOS.length).fill(false));
  const intervalRef = useRef<number | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [resultScore, setResultScore] = useState<number | null>(null);

  const task = tasks.find(t => t.id === 'task2');

  const startPlayback = () => {
    setIsPlaying(true);
    intervalRef.current = window.setInterval(() => {
      setVideoProgress(prev => {
        if (prev >= 100) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setIsPlaying(false);
          return 100;
        }
        return prev + 2; // Simulate progress
      });
    }, 100);
  };
  
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const handleQuizComplete = (score: number) => {
    // We'll just mark it as complete, score in this module is binary (done/not done)
    const newCompleted = [...completedVideos];
    newCompleted[currentVideoIndex] = true;
    setCompletedVideos(newCompleted);

    const totalCompleted = newCompleted.filter(Boolean).length;
    // FIX: Called 'updateTaskCompletion' with the required 'score' argument.
    updateTaskCompletion('task2', totalCompleted, score);

    // FIX: Renamed to use ADVANCED_VIDEOS.
    if(totalCompleted === ADVANCED_VIDEOS.length) {
        setView('completed');
    } else {
        setView('video_list');
    }
  // show result modal in this parent
  setResultScore(score);
  setShowResultModal(true);
  };
  
  const selectVideo = (index: number) => {
      setCurrentVideoIndex(index);
      setVideoProgress(0);
      setIsPlaying(false);
      if(intervalRef.current) clearInterval(intervalRef.current);
      setView('video_player');
  }

  const renderContent = () => {
    switch(view) {
        case 'video_list':
            return (
                <div className="w-full max-w-2xl text-center">
                    <h1 className="text-3xl font-bold mb-6">Basic Engine Functions</h1>
                    <div className="space-y-4">
                        {/* FIX: Renamed to use ADVANCED_VIDEOS. */}
                        {ADVANCED_VIDEOS.map((video, index) => (
                             <button
                                key={video.id}
                                onClick={() => selectVideo(index)}
                                disabled={completedVideos[index]}
                                className="w-full p-4 bg-white/50 dark:bg-gray-800/50 backdrop-blur-lg rounded-lg shadow-md flex justify-between items-center text-left disabled:opacity-50 disabled:cursor-not-allowed hover:bg-red-100/50 dark:hover:bg-red-900/30 transition-colors"
                            >
                                <span className="font-semibold">{index + 1}. {video.title}</span>
                                {completedVideos[index] ? <CheckIcon className="w-6 h-6 text-green-500" /> : <PlayIcon className="w-6 h-6" />}
                            </button>
                        ))}
                    </div>
                </div>
            );
        case 'video_player':
            // FIX: Renamed to use ADVANCED_VIDEOS.
            const video = ADVANCED_VIDEOS[currentVideoIndex];
            return (
                <div className="w-full max-w-3xl">
                     <h2 className="text-2xl font-bold mb-4 text-center">{video.title}</h2>
                    <div className="aspect-video bg-black rounded-lg shadow-lg overflow-hidden relative">
                       <iframe
                            className="w-full h-full"
                            src={`https://www.youtube.com/embed/${video.id}?autoplay=1&controls=0&modestbranding=1`}
                            title={video.title}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                        ></iframe>
                         {!isPlaying && videoProgress < 100 && (
                             <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                 <button onClick={startPlayback} className="text-white bg-red-600 rounded-full p-4 animate-pulse">
                                     <PlayIcon className="w-12 h-12" />
                                 </button>
                             </div>
                         )}
                    </div>
                    <div className="mt-4">
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
                            <div className="bg-red-600 h-4 rounded-full transition-all duration-200 ease-linear" style={{ width: `${videoProgress}%`}}></div>
                        </div>
                        {videoProgress >= 100 && (
                            <div className="text-center mt-4">
                                <button onClick={() => setView('quiz')} className="px-6 py-2 bg-green-500 text-white font-bold rounded-lg hover:bg-green-600">
                                    Proceed to Quiz
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            );
    case 'quiz':
      // FIX: Renamed to use ADVANCED_QUIZZES.
  return <Quiz questions={ADVANCED_QUIZZES[currentVideoIndex]} onComplete={handleQuizComplete} onShowResult={(s) => { setResultScore(s); setTimeout(() => setShowResultModal(true), 120); }} />
        case 'completed':
            return (
                <div className="text-center animate-fade-in">
                    <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckIcon className="w-16 h-16 text-white"/>
                    </div>
                    <h2 className="text-3xl font-bold">Task Completed!</h2>
                    <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">You've completed all video modules.</p>
                    <button onClick={() => setCurrentPage(Page.DASHBOARD)} className="mt-6 px-8 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors">Return to Dashboard</button>
                </div>
            )
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 pt-24 animate-fade-in">
      <button 
        onClick={() => view === 'video_list' || view === 'completed' ? setCurrentPage(Page.DASHBOARD) : setView('video_list')} 
        className="absolute top-20 left-4 sm:left-6 lg:left-8 flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-red-500 transition-colors"
      >
        <ChevronLeftIcon className="w-6 h-6"/>
        Back
      </button>
      {renderContent()}

      {showResultModal && resultScore !== null && (
        <div className="fixed inset-0 bg-white/90 backdrop-blur-md flex items-center justify-center z-50 p-4 sm:p-6">
          <div className="relative bg-white rounded-2xl shadow-xl w-[95%] max-w-4xl mx-auto overflow-hidden">
            <button
              onClick={() => setShowResultModal(false)}
              className="absolute top-4 right-4 text-blue-400 hover:text-blue-600 transition-colors z-20"
            >
              <XCircleIcon className="w-8 h-8" />
            </button>
            <div className="bg-blue-600 pt-12 pb-16 px-6 text-center relative">
              <h2 className="text-4xl sm:text-5xl font-bold text-white mb-2 tracking-tight">{t('congratulations') || 'Congratulations!'}</h2>
              <p className="text-xl text-blue-50 font-medium">{t('excellent_work') || 'Excellent work!'}</p>
            </div>
            <div className="relative -mt-12 mb-8 flex justify-center">
              <div className="w-44 h-44 rounded-full bg-white flex flex-col items-center justify-center border-[12px] border-blue-100 shadow-lg">
                <div className="text-sm uppercase tracking-wide font-medium text-gray-500 mb-1">{t('your_score') || 'Your Score'}</div>
                <div className="text-4xl font-bold text-blue-600 tracking-tight">{resultScore}/{ADVANCED_QUIZZES[currentVideoIndex].length}</div>
              </div>
            </div>
            <div className="px-8 pb-12 text-center">
              <p className="text-gray-600 text-lg mb-6 max-w-xl mx-auto">{t('quiz_result_detail') || 'You have completed the quiz. Your score has been recorded.'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EngineFunctionsTask;