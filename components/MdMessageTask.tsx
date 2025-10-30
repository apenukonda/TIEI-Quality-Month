
import React, { useState, useContext, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import { Page, Question } from '../types';
import Quiz from './Quiz';
import { MD_MESSAGE_QUIZ } from '../constants';
import { MD_MESSAGE_QUIZ_KN } from '../constants_kn';
import { ChevronLeftIcon, CheckIcon, XCircleIcon } from './icons';

// Function to get 7 random questions from MD_MESSAGE_QUIZ
const getRandomQuestions = (questions: typeof MD_MESSAGE_QUIZ, count: number) => {
  const shuffled = [...questions].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

const MdMessageTask: React.FC = () => {
  const { setCurrentPage, updateTaskCompletion, tasks, addScore, t, language } = useContext(AppContext);
  const [view, setView] = useState<'message' | 'instructions' | 'quiz' | 'completed'>('message');
  const [startedQuiz, setStartedQuiz] = useState(false);
  const [showBackWarning, setShowBackWarning] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState<Question[]>([]);
  const [currentQuizScore, setCurrentQuizScore] = useState(0);
  const [showResultModal, setShowResultModal] = useState(false);
  const [resultScore, setResultScore] = useState<number | null>(null);

  useEffect(() => {
    const task = tasks.find(t => t.id === 'task1');
    if (task && task.completedSteps > 0) {
      setView('completed');
    }
  }, [tasks]);

  useEffect(() => {
    if (view === 'quiz') {
      setStartedQuiz(true);
      // Always refresh questions when language or view changes
      setQuizQuestions(getRandomQuestions(language === 'kn' ? MD_MESSAGE_QUIZ_KN : MD_MESSAGE_QUIZ, 7));
    }
    // eslint-disable-next-line
  }, [view, language]);

  const handleQuizComplete = (score: number) => {
    updateTaskCompletion('task1', 7, score);
    setView('completed');
  };

  const handleShowResult = (score: number) => {
    setResultScore(score);
    // Small delay to avoid render/unmount races with onComplete navigation
    setTimeout(() => setShowResultModal(true), 120);
  };

  const handleBack = () => {
    if (startedQuiz) {
      setShowBackWarning(true);
    } else {
      setCurrentPage(Page.DASHBOARD);
    }
  };

  const confirmBack = () => {
    setShowBackWarning(false);
    // Mark as completed with current score
    updateTaskCompletion('task1', 7, currentQuizScore);
    setView('completed');
  };

  const cancelBack = () => {
    setShowBackWarning(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 pt-24 animate-fade-in">
      <button
        onClick={handleBack}
        data-kn-skip
        className="absolute top-20 left-4 sm:left-6 lg:left-8 flex items-center gap-2 text-black hover:text-red-500 transition-colors"
      >
        <ChevronLeftIcon className="w-6 h-6"/>
  {t('back')}
      </button>

      {view === 'message' && (
    <div className="w-full max-w-3xl text-center">
      <h1 className="text-4xl font-bold mb-4 mt-8 sm:mt-0">{t('md_message_title')}</h1>
      <div>
        {/* Show English poster by default; switch to Kannada poster when language === 'kn' */}
        <img src={language === 'kn' ? '/MDKan.png' : '/MDEng.png'} alt={t('md_message_title')} className="w-full h-auto rounded-lg mb-4" />
      </div>
            <button onClick={() => setView('instructions')} className="mt-8 px-8 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors">{t('start_quiz')}</button>
        </div>
      )}

      {view === 'instructions' && (
        <div className="w-full max-w-3xl text-center">
          <h2 className="text-3xl font-bold mb-4">{language === 'kn' ? 'MD ಸಂದೇಶ ರಸಪ್ರಶ್ನೆ' : 'MD Message Quiz'}</h2>
          <h2 className="text-3xl font-bold mb-4">{t('Instructions') || 'Instructions:'}</h2>
          <ul className="text-left mx-auto max-w-xl  list-outside list-disc text-lg space-y-3 mb-6">
            <li>{t('instr_read_each') || 'Read each question carefully and select the correct answer from the given choices.'}</li>
            <li>{t('instr_each_point') || 'Each correct answer will earn 1 point.'}</li>
            <li>{t('instr_top_scorer') || 'The top scorer will be recognized and selected for the next round of evaluation (considering all types of quizzes).'}</li>
          </ul>
          <div className="flex justify-center gap-4">
            <button onClick={() => setView('message')} className="px-6 py-2 bg-white text-black font-bold rounded-lg border border-gray-200 hover:bg-gray-100">{t('back') || 'Back'}</button>
            <button onClick={() => setView('quiz')} className="px-6 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700">{t('begin_quiz') || 'Begin Quiz'}</button>
          </div>
        </div>
      )}

  {view === 'quiz' && quizQuestions.length > 0 && (
    <Quiz questions={quizQuestions} onComplete={handleQuizComplete} onScoreUpdate={setCurrentQuizScore} onShowResult={handleShowResult} />
  )}
      
      {view === 'completed' && (
        <div className="text-center animate-fade-in">
          <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckIcon className="w-16 h-16 text-white"/>
          </div>
          <h2 className="text-3xl font-bold">{t('task_completed_title') || 'Task Completed!'}</h2>
          <p className="mt-2 text-lg text-black">{t('task_completed_message') || "You've successfully completed the MD Message module."}</p>
          <button data-kn-skip onClick={() => setCurrentPage(Page.DASHBOARD)} className="mt-6 px-8 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors">{t('back')}</button>
        </div>
      )}

      {showBackWarning && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 text-center transform transition-all scale-95 opacity-0 animate-fade-in" style={{ animationDelay: '100ms', animationFillMode: 'forwards', animationName: 'zoomIn' }}>
            <style>{`@keyframes zoomIn { to { transform: scale(1); opacity: 1; } }`}</style>
            <button onClick={cancelBack} className="absolute top-3 right-3 text-black hover:text-red-500">
              <XCircleIcon className="w-8 h-8"/>
            </button>
            <h2 className="text-2xl font-extrabold text-black mb-4">Warning!!</h2>
            <p className="text-black mb-6">You will get only <strong>{currentQuizScore} points</strong>. All others answers will be considered incorrect answers. Are you sure want to do that?</p>
            <div className="flex gap-4">
              <button onClick={cancelBack} className="flex-1 py-2 bg-white text-black font-bold rounded-lg hover:bg-gray-300 transition-colors">Cancel</button>
              <button onClick={confirmBack} className="flex-1 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors">Confirm</button>
            </div>
          </div>
        </div>
      )}
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
              <p className="text-xl text-blue-50 font-medium">{t('excellent_work') || `Excellent work!`}</p>
            </div>
            <div className="relative -mt-12 mb-8 flex justify-center">
              <div className="w-44 h-44 rounded-full bg-white flex flex-col items-center justify-center border-[12px] border-blue-100 shadow-lg">
                <div className="text-sm uppercase tracking-wide font-medium text-gray-500 mb-1">{t('your_score') || 'Your Score'}</div>
                <div className="text-4xl font-bold text-blue-600 tracking-tight">{resultScore}/7</div>
              </div>
            </div>
            <div className="px-8 pb-12 text-center">
              <p className="text-gray-600 text-lg mb-6 max-w-xl mx-auto">{t('quiz_result_detail') || 'You have completed the quiz. Your score has been saved.'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MdMessageTask;
