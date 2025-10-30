
import React, { useState, useEffect, useContext } from 'react';
import { Question } from '../types';
import { CheckCircleIcon, XCircleIcon } from './icons';
import { AppContext } from '../context/AppContext';

interface QuizProps {
  questions: Question[];
  onComplete: (score: number) => void;
  onScoreUpdate?: (score: number) => void;
  onShowResult?: (score: number) => void;
  quizId?: string;
}

const TIMER_DURATION = 20;

const Quiz: React.FC<QuizProps> = ({ questions, onComplete, onScoreUpdate, onShowResult = undefined, quizId }) => {
  // Parent component should persist the quiz score (via updateTaskCompletion or addScore)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [timer, setTimer] = useState(TIMER_DURATION);
  const [showFeedback, setShowFeedback] = useState(false);
  // Modal is shown by parent via onShowResult prop. Quiz no longer manages result modal UI.

  const currentQuestion = questions && questions.length > 0 ? questions[currentQuestionIndex] : undefined;
  const isCorrect = currentQuestion ? selectedOption === currentQuestion.correctAnswer : false;
  const { t, language, currentUser } = useContext(AppContext);
  const [langVersion, setLangVersion] = useState(0);

  useEffect(() => {
    // bump version to cause dependent effects/renders when language changes
    setLangVersion(v => v + 1);
  }, [language]);

  // helper to get localized text. The codebase sometimes uses strings in the
  // format 'English-Kannada' inside constants. When language === 'kn' prefer
  // the Kannada suffix after the last '-' if present. Otherwise use the
  // translations map via t().
  const localize = (text: string) => {
    // If translations map has the key, prefer that
    const translated = t(text);
    if (translated !== text) return translated;
    // If user selected Kannada and the text contains a dash-separated pair,
    // return the last segment which is often the Kannada version.
    // Be liberal about dash characters: support hyphen-minus, en-dash and em-dash.
    if (language === 'kn') {
      const dashSplit = text.split(/[-–—]/).map(s => s.trim()).filter(Boolean);
      if (dashSplit.length >= 2) {
        // prefer the last segment as the Kannada portion
        return dashSplit[dashSplit.length - 1];
      }
    }

    return text;
  };

  // Prefer per-question Kannada fields where available. This helper will be
  // used for question text and options below.
  const localizeQuestionText = (q: Question) => {
    if (language === 'kn' && (q as any).textKn) return (q as any).textKn as string;
    return localize(q.text);
  };

  const localizeOption = (q: Question, idx: number) => {
    if (language === 'kn' && Array.isArray((q as any).optionsKn) && (q as any).optionsKn[idx]) {
      return (q as any).optionsKn[idx] as string;
    }
    return localize(q.options[idx]);
  };

  useEffect(() => {
    if (showFeedback) return;

    const interval = setInterval(() => {
      setTimer(prev => {
        if (prev === 1) {
          if (!selectedOption) {
            setSelectedOption('timeout');
            setShowFeedback(true);
          } else {
            handleNext();
          }
          return TIMER_DURATION;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuestionIndex, showFeedback, langVersion]);

  const handleOptionSelect = (option: string) => {
    if (showFeedback) return;
    if (!currentQuestion) return;
    setSelectedOption(option);
    if (option === currentQuestion.correctAnswer) {
      setScore(s => {
        const newScore = s + 1;
        onScoreUpdate?.(newScore);
        return newScore;
      });
    } else {
      onScoreUpdate?.(score);
    }
    setShowFeedback(true);
  };

  const handleNext = () => {
    setShowFeedback(false);
    setSelectedOption(null);
    setTimer(TIMER_DURATION);
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      // When it's the last question and user clicks finish
      // Inform parent that quiz is complete first
      onComplete(score);
      // Ask parent to show the result UI if it wants to (call safely)
      if (typeof onShowResult === 'function') onShowResult(score);
    }
  };

  const getButtonClass = (option: string) => {
    // Default (no feedback): light card with subtle border and hover
    if (!showFeedback) {
      return 'bg-white border border-slate-100 hover:border-slate-200 shadow-sm';
    }
    if (!currentQuestion) return 'bg-white border border-slate-100 opacity-50';
    if (option === currentQuestion.correctAnswer) {
      return 'bg-emerald-600 text-white border-emerald-600';
    }
    if ((option === selectedOption && option !== currentQuestion.correctAnswer) || (selectedOption === 'timeout' && option !== currentQuestion.correctAnswer)) {
      return 'bg-rose-600 text-white border-rose-600';
    }
    return 'bg-white border border-slate-100 opacity-60';
  };

  // Back navigation/confirmation is handled by the parent component (MdMessageTask).
  // Removing local back UI to avoid duplicate controls and keep a single source
  // of truth for the confirmation modal.

  // Reset local quiz state only when the quiz identity changes (new quiz load).
  // This prevents language-only updates to the questions array from resetting
  // the user's progress during an in-progress quiz.
  useEffect(() => {
    setCurrentQuestionIndex(0);
    setSelectedOption(null);
    setScore(0);
    setTimer(TIMER_DURATION);
    setShowFeedback(false);
  }, [quizId]);

  // If there are no questions or currentQuestion is undefined, render a loading fallback
  if (!questions || questions.length === 0 || !currentQuestion) {
    return (
      <div className="bg-white/90 backdrop-blur-lg p-8 rounded-2xl shadow-2xl w-full max-w-3xl animate-fade-in relative">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-slate-800">{t('question_label') || 'Question'}</h3>
        </div>
        <p className="text-base text-slate-600">{t('loading_questions') || 'Loading questions...'}</p>
      </div>
    );
  }

  // Diagnostic: log whether currentQuestion includes Kannada fields when rendering
  try {
    // eslint-disable-next-line no-console
    console.log('[i18n][Quiz] render language=', language, 'currentQuestion.textKn=', (currentQuestion as any)?.textKn);
  } catch (e) {}

  return (
    <div className="bg-white/95 backdrop-blur p-6 rounded-2xl shadow-2xl w-full max-w-3xl animate-fade-in relative">
      <div className="flex items-start justify-between gap-4 mb-4" data-kn-skip>
        <div>
          <h3 className="text-lg font-semibold text-slate-800">{t('question_label')} {currentQuestionIndex + 1}/{questions.length}</h3>
          {/* <p className="text-sm text-slate-500 mt-1">{t('quiz_subtitle') || ''}</p> */}
        </div>
        <div className="flex items-center gap-3">
          <div className="text-base font-semibold text-slate-700 px-3 py-1 bg-slate-100 rounded-full">{timer}s</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-slate-100 rounded-full h-2 mb-6 overflow-hidden">
        <div
          className="h-2 bg-gradient-to-r from-rose-500 via-fuchsia-500 to-indigo-600 transition-all"
          style={{ width: `${((currentQuestionIndex) / questions.length) * 100}%` }}
        />
      </div>

      <p className="text-xl font-semibold text-slate-800 mb-6">{localizeQuestionText(currentQuestion)}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {currentQuestion.options.map((option, idx) => {
          const localized = localizeOption(currentQuestion, idx);
          const btnClass = getButtonClass(option);
          const isCorrectOption = option === currentQuestion.correctAnswer;
          const isSelected = selectedOption === option;
          // Badge color: only highlight correct/incorrect after feedback or when user selected
          const badgeClass = showFeedback
            ? isCorrectOption
              ? 'bg-emerald-600 text-white border-2 border-white'
              : isSelected
                ? 'bg-rose-600 text-white'
                : 'bg-slate-200 text-slate-700'
            : isSelected
              ? 'bg-indigo-600 text-white'
              : 'bg-slate-200 text-slate-700';

          return (
            <button
              key={option}
              onClick={() => handleOptionSelect(option)}
              disabled={showFeedback}
              className={`p-4 rounded-xl text-left font-medium transition-shadow duration-200 shadow-sm hover:shadow-md flex items-center gap-3 ${btnClass}`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${badgeClass}`}>
                {String.fromCharCode(65 + idx)}
              </div>
              <div className="flex-1 text-slate-800">{localized}</div>
            </button>
          );
        })}
      </div>

      {showFeedback && (
        <div className="mt-6 p-4 rounded-lg bg-slate-50 border border-slate-100 shadow-sm animate-fade-in">
          <div className="flex items-center justify-center gap-3 text-lg font-semibold">
            {selectedOption === currentQuestion.correctAnswer ? <CheckCircleIcon className="w-7 h-7 text-emerald-500" /> : <XCircleIcon className="w-7 h-7 text-rose-500" />}
            <span className={selectedOption === currentQuestion.correctAnswer ? 'text-emerald-600' : 'text-rose-600'}>
              {selectedOption === 'timeout' ? t('time_up_incorrect') : selectedOption === currentQuestion.correctAnswer ? t('correct') : t('incorrect')}
            </span>
          </div>
          {selectedOption !== currentQuestion.correctAnswer && (
            <p className="mt-4 text-slate-600 text-center mx-auto max-w-2xl">{t('correct_answer_was').replace(':','')} <strong className="text-slate-800">{localize(currentQuestion.correctAnswer)}</strong></p>
          )}
          <div className="mt-4 flex justify-center">
            <button onClick={handleNext} className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors">
              {currentQuestionIndex < questions.length - 1 ? t('next_question') : t('finish_quiz')}
            </button>
          </div>
        </div>
      )}

      {/* Result modal UI is now managed by parent components via onShowResult */}
    </div>
  );
};

export default Quiz;
