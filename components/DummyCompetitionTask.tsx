import React, { useContext, useState } from 'react';
import { AppContext } from '../context/AppContext';
import { Page } from '../types';
import { ChevronLeftIcon } from './icons';

interface DummyCompetitionTaskProps {
  taskId: string;
  title: string;
}

const DummyCompetitionTask: React.FC<DummyCompetitionTaskProps> = ({ taskId, title }) => {
  const { setCurrentPage, updateTaskCompletion, language, t } = useContext(AppContext);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      await updateTaskCompletion(taskId, 1, 0);
      setSubmitted(true);
      setTimeout(() => setCurrentPage(Page.DASHBOARD), 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 pt-24 text-center animate-fade-in">
      <button data-kn-skip onClick={() => setCurrentPage(Page.DASHBOARD)} className="absolute top-20 left-4 flex items-center gap-2 text-black hover:text-red-500">
        <ChevronLeftIcon className="h-6 w-6" />{t('back')}
      </button>
      <div className="w-full max-w-2xl">
        <h1 className="mt-8 mb-4 text-4xl font-bold">{title}</h1>
        <div className="rounded-2xl bg-white p-8 text-left shadow-xl">
          <h2 className="mb-4 text-center text-2xl font-semibold">Instructions</h2>
          <p className="text-black">
            {language === 'kn'
              ? 'ಈ ಸ್ಪರ್ಧೆಯ ವಿವರವಾದ ಸೂಚನೆಗಳನ್ನು ಶೀಘ್ರದಲ್ಲೇ ಹಂಚಿಕೊಳ್ಳಲಾಗುತ್ತದೆ. ಹೆಚ್ಚಿನ ಮಾಹಿತಿಗಾಗಿ ಮತ್ತೆ ಪರಿಶೀಲಿಸಿ.'
              : 'Detailed instructions and submission functionality for this activity will be shared soon.'}
          </p>
          <button onClick={handleSubmit} disabled={submitting || submitted} className="mt-8 w-full rounded-lg bg-red-600 px-8 py-3 font-bold text-white hover:bg-red-700 disabled:opacity-50">
            {submitting ? 'Submitting...' : submitted ? 'Submitted' : 'Submit'}
          </button>
          {error && <p className="mt-3 text-red-600">{error}</p>}
        </div>
      </div>
    </div>
  );
};

export default DummyCompetitionTask;
