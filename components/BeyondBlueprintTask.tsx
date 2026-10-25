import React, { useContext, useEffect, useState } from 'react';
import { AppContext } from '../context/AppContext';
import supabaseClient from '../context/supabaseClient';
import { Page } from '../types';
import { ChevronLeftIcon } from './icons';

interface BeyondBlueprintTaskProps {
  taskId: string;
  title: string;
}

const BeyondBlueprintTask: React.FC<BeyondBlueprintTaskProps> = ({ taskId, title }) => {
  const { currentUser, language, setCurrentPage, updateTaskCompletion, t } = useContext(AppContext);
  const [problem, setProblem] = useState('');
  const [wayOfOutflow, setWayOfOutflow] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadSubmission = async () => {
      if (!currentUser?.id) {
        setLoading(false);
        return;
      }

      const [{ data, error: loadError }, { data: progress, error: progressError }] = await Promise.all([
        supabaseClient
        .from('beyond_blueprint_submissions')
        .select('id, problem, way_of_outflow')
        .eq('user_id', currentUser.id)
        .maybeSingle(),
        supabaseClient
          .from('user_tasks')
          .select('completed_steps')
          .eq('user_id', currentUser.id)
          .eq('task_id', 'task9')
          .maybeSingle(),
      ]);

      if (loadError || progressError) {
        setError((loadError || progressError)?.message || 'Saved progress could not be loaded.');
      } else {
        if (data) {
          setProblem(data.problem);
          setWayOfOutflow(data.way_of_outflow);
        }
        setSubmitted(Boolean(data && progress?.completed_steps >= 1));
      }
      setLoading(false);
    };

    loadSubmission();
  }, [currentUser?.id]);

  const submitObservation = async () => {
    if (!currentUser?.id || !problem.trim() || !wayOfOutflow.trim()) return;

    setSubmitting(true);
    setError('');
    const { error: insertError } = await supabaseClient
      .from('beyond_blueprint_submissions')
      .upsert({
        user_id: currentUser.id,
        problem: problem.trim(),
        way_of_outflow: wayOfOutflow.trim(),
      }, { onConflict: 'user_id', ignoreDuplicates: true });

    if (insertError) {
      setError(insertError.message);
      setSubmitting(false);
      return;
    }

    try {
      await updateTaskCompletion(taskId, 1, 0);
      setSubmitted(true);
      setShowConfirm(false);
    } catch (completionError) {
      setError(completionError instanceof Error ? completionError.message : 'The submission was saved, but progress could not be updated.');
    } finally {
      setSubmitting(false);
    }
  };

  const instructions = language === 'kn'
    ? [
        'ನಿಮ್ಮ ಕೆಲಸದ ಸ್ಥಳದಲ್ಲಿರುವ ಪೋಕಾ-ಯೋಕೆ ವ್ಯವಸ್ಥೆಯನ್ನು ಗಮನಿಸಿ. ಅದು ವಿಫಲವಾಗುವ ಅಥವಾ ಬೈಪಾಸ್ ಆಗುವ ಸಾಧ್ಯತೆಗಳನ್ನು ಗುರುತಿಸಿ.',
        'ಕೆಲಸದ ಸ್ಥಳ ಮತ್ತು ಪ್ರಕ್ರಿಯೆಯ ಹೆಸರನ್ನು ಸಂಕ್ಷಿಪ್ತವಾಗಿ ನಮೂದಿಸಿ.',
        'ಪೋಕಾ-ಯೋಕೆ ವ್ಯವಸ್ಥೆ ಮತ್ತು ಅದು ವಿಫಲವಾಗುವ ಅಥವಾ ಬೈಪಾಸ್ ಆಗುವ ಸಾಧ್ಯತೆಯನ್ನು ಸಂಕ್ಷಿಪ್ತವಾಗಿ ವಿವರಿಸಿ.',
        'ನಿಮ್ಮ ಅವಲೋಕನವನ್ನು ಒದಗಿಸಿರುವ Blueprint Pocket Form ನಲ್ಲಿ ಹಂತ ಹಂತವಾಗಿ ದಾಖಲಿಸಿ.',
      ]
    : [
        'Observe the Poka-Yoke provided at your workplace and identify possible ways it could fail or be bypassed, allowing a defect to escape.',
        'Mention the workplace and process name briefly.',
        'Briefly describe the Poka-Yoke and the potential failure or bypass method.',
        'Record your observation step-by-step in the provided Blueprint Pocket Form below.',
      ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 pt-24 text-center animate-fade-in">
      <button data-kn-skip onClick={() => setCurrentPage(Page.DASHBOARD)} className="absolute top-20 left-4 flex items-center gap-2 text-black hover:text-red-500">
        <ChevronLeftIcon className="h-6 w-6" />{t('back')}
      </button>
      <div className="w-full max-w-3xl">
        <h1 className="mt-8 mb-4 text-4xl font-bold">{title}</h1>
        <div className="rounded-2xl bg-white p-8 text-left shadow-xl">
          <h2 className="mb-4 text-center text-2xl font-semibold">{language === 'kn' ? 'ಸೂಚನೆಗಳು' : 'Instructions'}</h2>
          <ul className="list-disc space-y-2 pl-5 text-black">
            {instructions.map((instruction) => <li key={instruction}>{instruction}</li>)}
          </ul>
        </div>

        <div className="mt-6 rounded-2xl bg-white p-8 text-left shadow-xl">
          {loading ? (
            <p className="text-black">{language === 'kn' ? 'ಲೋಡ್ ಆಗುತ್ತಿದೆ...' : 'Loading...'}</p>
          ) : submitted ? (
            <p className="font-semibold text-green-700">
              {language === 'kn' ? 'ನಿಮ್ಮ ಅವಲೋಕನವನ್ನು ಈಗಾಗಲೇ ಸಲ್ಲಿಸಲಾಗಿದೆ.' : 'Your observation has already been submitted.'}
            </p>
          ) : (
            <>
              <label className="mb-2 block font-semibold text-black" htmlFor="problem-identified">
                {language === 'kn' ? 'ಗುರುತಿಸಲಾದ ಸಮಸ್ಯೆಯ ವಿವರಗಳು' : 'Identified Problem(Poka-Yoke) Details'} <span className="text-red-600">*</span>
              </label>
              <textarea id="problem-identified" value={problem} onChange={(event) => setProblem(event.target.value)} className="mb-5 min-h-28 w-full rounded-lg border border-gray-300 p-3 text-black" required />
              <label className="mb-2 block font-semibold text-black" htmlFor="way-of-outflow">
                {language === 'kn' ? 'ಪ್ರಸ್ತಾಪಿತ ಪರಿಹಾರದ ವಿವರಗಳು' : 'Possibilities of outflow details'} <span className="text-red-600">*</span>
              </label>
              <textarea id="way-of-outflow" value={wayOfOutflow} onChange={(event) => setWayOfOutflow(event.target.value)} className="min-h-28 w-full rounded-lg border border-gray-300 p-3 text-black" required />
              <button onClick={() => setShowConfirm(true)} disabled={!problem.trim() || !wayOfOutflow.trim() || submitting} className="mt-6 rounded-lg bg-red-600 px-8 py-3 font-bold text-white hover:bg-red-700 disabled:opacity-50">
                {language === 'kn' ? 'ಸಲ್ಲಿಸಿ' : 'Submit'}
              </button>
            </>
          )}
          {error && <p className="mt-3 text-red-600">{error}</p>}
        </div>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-2xl">
            <h2 className="mb-4 text-2xl font-bold">{language === 'kn' ? 'ದಯವಿಟ್ಟು ಪರಿಶೀಲಿಸಿ' : 'Please review before submitting'}</h2>
            <p className="mb-6 text-black">{language === 'kn' ? 'ಇದು ಸಲ್ಲಿಸಿದ ನಂತರ ಬದಲಾಯಿಸಲು ಸಾಧ್ಯವಿಲ್ಲ. ನೀವು ಸಲ್ಲಿಸಲು ಖಚಿತವೇ?' : 'This will be submitted and cannot be edited afterward. Please review before submit.'}</p>
            <div className="flex justify-center gap-4">
              <button onClick={() => setShowConfirm(false)} className="rounded-lg bg-gray-300 px-6 py-2 text-gray-800 hover:bg-gray-400">{t('cancel')}</button>
              <button onClick={submitObservation} disabled={submitting} className="rounded-lg bg-red-600 px-6 py-2 text-white hover:bg-red-700 disabled:opacity-50">
                {submitting ? (language === 'kn' ? 'ಸಲ್ಲಿಸಲಾಗುತ್ತಿದೆ...' : 'Submitting...') : (language === 'kn' ? 'ದೃಢೀಕರಿಸಿ ಮತ್ತು ಸಲ್ಲಿಸಿ' : 'Confirm & Submit')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BeyondBlueprintTask;
