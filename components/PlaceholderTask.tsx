import React, { useContext, useState } from 'react';
import supabaseClient from '../context/supabaseClient';
import { AppContext } from '../context/AppContext';
import { Page } from '../types';
import { ChevronLeftIcon } from './icons';

interface PlaceholderTaskProps {
  taskId: string;
  title: string;
  instructions: string[];
  score: number;
}

const PlaceholderTask: React.FC<PlaceholderTaskProps> = ({ taskId, title, instructions, score }) => {
  const { setCurrentPage, updateTaskCompletion, t, language, currentUser } = useContext(AppContext);
  const [slogan, setSlogan] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSloganSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      // Save slogan to Supabase (user_slogans table)
      const { error } = await supabaseClient
        .from('user_slogans')
        .upsert({ user_id: currentUser?.id, slogan });
      if (error) throw new Error(error.message || 'Failed to submit slogan');
      await updateTaskCompletion(taskId, 1, score);
      setSuccess(true);
      setTimeout(() => setCurrentPage(Page.DASHBOARD), 1200);
    } catch (e: any) {
      setError(e.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleKaizenComplete = async () => {
    setSubmitting(true);
    setError('');
    try {
      // Just update task completion, no data submission to our DB for this one.
      await updateTaskCompletion(taskId, 1, score);
      setSuccess(true);
      setTimeout(() => setCurrentPage(Page.DASHBOARD), 1200);
    } catch (e: any)      {
      setError(e.message || 'Failed to mark as complete.');
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 pt-24 text-center animate-fade-in">
      <button 
        data-kn-skip
        onClick={() => setCurrentPage(Page.DASHBOARD)} 
        className="absolute top-20 left-4 sm:left-6 lg:left-8 flex items-center gap-2 text-black hover:text-red-500 transition-colors"
      >
        <ChevronLeftIcon className="w-6 h-6"/>
          {t('back')}
      </button>

      <div className="w-full max-w-2xl">
  <h1 className="text-4xl font-bold mb-4 mt-8 sm:mt-0">{language === 'kn' && (title === 'Slogan Writer' || title === 'Suggestion Box' || title === 'Slogan Competition' || title === 'Kaizen Suggestion') ? (title === 'Slogan Writer' ? 'ಸ್ಲೋಗನ್ ರಚನೆ' : title === 'Suggestion Box' ? 'ಸಲಹೆ ಪೆಟ್ಟಿಗೆ' : title === 'Slogan Competition' ? 'ಸ್ಲೋಗನ್ ಸ್ಪರ್ಧೆ' : 'ಕೈಝೆನ್ ಸಲಹೆ') : title}</h1>
        <div className="bg-white p-8 rounded-2xl shadow-xl text-left mb-8">
      <h2 className="text-2xl font-semibold text-black mb-4 text-center">{language === 'kn' ? 'ಸೂಚನೆಗಳು' : 'Instructions'}</h2>
            <ul className="list-disc list-outside text-l space-y-2 text-black">
        {instructions.map((inst, index) => <li key={index}>{language === 'kn' ? translateInstruction(inst) : inst}</li>)}
            </ul>
        </div>
        {title === 'Slogan Competition' ? (
          <div className="bg-white p-8 rounded-2xl shadow-xl">
            <h2 className="text-2xl font-semibold text-black mb-4">{language === 'kn' ? 'ನಿಮ್ಮ ಸ್ಲೋಗನ್ ಅನ್ನು ನಮೂದಿಸಿ' : 'Enter your slogan'}</h2>
            <textarea
              className="w-full border border-gray-300 rounded-lg p-3 mb-4 min-h-[80px]"
              placeholder={language === 'kn' ? 'ಇಲ್ಲಿ ನಿಮ್ಮ ಸ್ಲೋಗನ್ ಅನ್ನು ಬರೆಯಿರಿ...' : 'Type your slogan here...'}
              value={slogan}
              onChange={e => setSlogan(e.target.value)}
              disabled={submitting || success}
              maxLength={200}
            />
            <button
              onClick={() => setShowConfirm(true)}
              className="px-8 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              disabled={submitting || !slogan.trim() || success}
            >
              {submitting ? (language === 'kn' ? 'ಸಲ್ಲಿಸಲಾಗುತ್ತಿದೆ...' : 'Submitting...') : (language === 'kn' ? 'ಸಲ್ಲಿಸಿ' : 'Submit')}
            </button>
            {/* Confirmation Modal */}
            {showConfirm && (
              <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
                <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 text-center">
                  <h2 className="text-2xl font-bold mb-4">{language === 'kn' ? 'ದಯವಿಟ್ಟು ದೃಢೀಕರಿಸಿ' : 'Please Confirm'}</h2>
                  <p className="mb-4">{language === 'kn' ? 'ನೀವು ಸಲ್ಲಿಸಲು ಬಯಸುವ ಸ್ಲೋಗನ್:' : 'You are about to submit this slogan:'}</p>
                  <div className="bg-gray-100 rounded-lg p-4 mb-4 text-black text-lg">{slogan}</div>
                  <div className="flex gap-4 justify-center">
                    <button
                      onClick={() => setShowConfirm(false)}
                      className="px-6 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400"
                    >
                      {language === 'kn' ? 'ರದ್ದುಮಾಡಿ' : 'Cancel'}
                    </button>
                    <button
                      onClick={async () => { setShowConfirm(false); await handleSloganSubmit(); }}
                      className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                      disabled={submitting}
                    >
                      {language === 'kn' ? 'ದೃಢೀಕರಿಸಿ ಮತ್ತು ಸಲ್ಲಿಸಿ' : 'Confirm & Submit'}
                    </button>
                  </div>
                </div>
              </div>
            )}
            {error && <div className="mt-2 text-red-600">{error}</div>}
            {success && <div className="mt-2 text-green-600">{language === 'kn' ? 'ಸ್ಲೋಗನ್ ಯಶಸ್ವಿಯಾಗಿ ಸಲ್ಲಿಸಲಾಗಿದೆ!' : 'Slogan submitted successfully!'}</div>}
          </div>
        ) : title === 'Kaizen Suggestion' ? (
          <div className="bg-white p-8 rounded-2xl shadow-xl text-center">
            <h2 className="text-2xl font-semibold text-black mb-4">{language === 'kn' ? 'ಸಲಹೆ ಫಾರ್ಮ್' : 'Suggestion Form'}</h2>
            <a 
              href="https://forms.office.com/r/vJ2dA7FUGW" // Microsoft Form URL
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-block px-8 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors mb-6"
            >
              {language === 'kn' ? 'Microsoft ಫಾರ್ಮ್ ತೆರೆಯಿರಿ' : 'Open Microsoft Form'}
            </a>
            <hr className="my-4 border-gray-200" />
            <button
              onClick={handleKaizenComplete}
              className="px-8 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              disabled={submitting || success}
            >
              {submitting ? (language === 'kn' ? 'ಸಲ್ಲಿಸಲಾಗುತ್ತಿದೆ...' : 'Submitting...') : success ? (language === 'kn' ? 'ಪೂರ್ಣಗೊಂಡಿದೆ!' : 'Completed!') : (language === 'kn' ? 'ಪೂರ್ಣಗೊಂಡಿದೆ ಎಂದು ಗುರುತಿಸಿ' : 'Mark as Complete')}
            </button>
            {error && <div className="mt-2 text-red-600">{error}</div>}
            {success && <div className="mt-2 text-green-600">{language === 'kn' ? 'ಕಾರ್ಯ ಯಶಸ್ವಿಯಾಗಿ ಪೂರ್ಣಗೊಂಡಿದೆ!' : 'Task completed successfully!'}</div>}
          </div>
        ) : (
          <div className="bg-white p-8 rounded-2xl shadow-xl">
            <h2 className="text-2xl font-semibold text-black">{t('coming_soon')}</h2>
            <p className="mt-4 text-black">
              {t('placeholder_dev_line1')}
              {' '}
              {t('placeholder_dev_line2')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// Minimal translation for the hardcoded instruction lines used in Slogan Writer / Suggestion Box.
function translateInstruction(inst: string) {
  const translations: Record<string, string> = {
    // Slogan task lines
    "The slogan should be related to Quality.": 'ಘೋಷವಾಕ್ಯವು ಗುಣಮಟ್ಟಕ್ಕೆ ಸಂಬಂಧಿಸಿದಿರಬೇಕು.',
    "Slogans are accepted in both Kannada and English.": 'ಘೋಷವಾಕ್ಯಗಳನ್ನು ಕನ್ನಡ ಮತ್ತು ಇಂಗ್ಲಿಷ್ ಎರಡಲ್ಲಿಯೂ ಸ್ವೀಕರಿಸಲಾಗುತ್ತದೆ.',
    "A unique slogan is preferred for prize selection.": 'ಬಹುಮಾನ ಆಯ್ಕೆಗಾಗಿ ವಿಶಿಷ್ಟ ಘೋಷವಾಕ್ಯಕ್ಕೆ ಆದ್ಯತೆ ಕೊಡಲಾಗುತ್ತದೆ.',
    
    "This category will have a separate Top-3 special recognition.": 'ಈ ವರ್ಗಕ್ಕೆ ವಿಶಿಷ್ಟವಾದ Top-3 ವಿಶೇಷ ಗೌರವಗಳನ್ನು ನೀಡಲಾಗುತ್ತದೆ.',

    // Previous slogan/sample lines
    "The theme for this year is 'Think Differently.'": 'ಈ ವರ್ಷದ ವಿಷಯ: ವಿಭಿನ್ನವಾಗಿ ಯೋಚಿಸಿ.',
    "Craft a catchy and inspiring slogan related to quality and innovation.": 'ಗುಣಮಟ್ಟ ಮತ್ತು ನಾವೀನ್ಯತೆಗೆ ಸಂಬಂಧಿಸಿದ ಕ್ಯಾಚಿ ಮತ್ತು ಪ್ರೇರಣಾದಾಯಕ ಸ್ಲೋಗನ್ ರಚಿಸಿ.',
    "Submissions will be reviewed by the management committee.": 'ಸಲ್ಲಿಕೆಗಳನ್ನು ನಿರ್ವಹಣಾ ಸಮಿತಿ ಪರಿಶೀಲಿಸುವುದು.' ,
    "The winning slogan will be featured in next month's company-wide newsletter.": 'ವಿಜೇತ ಸ್ಲೋಗನ್ ಮುಂದಿನ ತಿಂಗಳ ಸಂಸ್ಥಾಪ್ರಚಾರ ಪತ್ರಿಕೆಯಲ್ಲಿ ಪ್ರದರ್ಶಿಸಲಾಗುತ್ತದೆ.',

    // Kaizen suggestion lines
    "This is your chance to contribute to Kaizen (Continuous Improvement).": 'ಕೈಝೆನ್ (ನಿರಂತರ ಸುಧಾರಣೆ) ಗೆ ನಿಮ್ಮ ಕೊಡುಗೆ ನೀಡಲು ಇದು ನಿಮ್ಮ ಅವಕಾಶ.',
    "Think about a process in your daily work that could be more efficient or safer.": 'ನಿಮ್ಮ ದೈನಂದಿನ ಕೆಲಸದಲ್ಲಿನ ಹೆಚ್ಚು ಕಾರ್ಯಕ್ಷಮ ಅಥವಾ ಸುರಕ್ಷಿತವಾಗಲು ಸಾಧ್ಯವಾಗುವ ಪ್ರಕ್ರಿಯೆಯನ್ನು ಕುರಿತು ಯೋಚಿಸಿ.' ,
    "Describe the problem and your proposed solution.": 'ಸಮಸ್ಯೆಯನ್ನು ಮತ್ತು ನಿಮಗೆ ತೋರಿಸಿದ ಪರಿಹಾರವನ್ನು ವಿವರಿಸಿ.' ,
    "All suggestions will be evaluated for feasibility and impact.": 'ಎಲ್ಲಾ ಸಲಹೆಗಳನ್ನೂ ಕಾರ್ಯಪ್ರವೃತ್ತಿಗಾಗಿ ಮತ್ತು ಪರಿಣಾಮಕ್ಕಾಗಿ ಮೌಲ್ಯಮಾಪನ ಮಾಡಲಾಗುತ್ತದೆ.'
  ,
  // New Kaizen instruction lines translations
  "Click the “Open Microsoft Form” button to participate in the contest.": 'ಸ್ಪರ್ಧೆಯಲ್ಲಿ ಭಾಗವಹಿಸಲು ದಯவಿಟ್ಟು "Microsoft ಫಾರ್ಮ್ ತೆರೆಯಿರಿ" ಬಟನ್ ಕ್ಲಿಕ್ ಮಾಡಿ.',
  "Once you click the link, you will be redirected to the Microsoft Form.": 'ನೀವು ಲಿಂಕ್ ಕ್ಲಿಕ್ ಮಾಡಿದ ನಂತರ, ನೀವು Microsoft ಫಾರ್ಮ್‌ಗೆ ಪುನರ್‌ನಿರ್ದೇಶಿಸಲ್ಪಡುವಿರಿ.',
  "Read the instructions on the Microsoft Form carefully.": 'Microsoft ಫಾರ್ಮ್ನಲ್ಲಿನ ಸೂಚನೆಗಳನ್ನು ದಯವಿಟ್ಟು ಗಮನದಿಂದ ಓದಿ.',
  "After submitting the Microsoft Form, click the “Mark as Complete” button to receive your completion score.": 'Microsoft ಫಾರ್ಮ್ ಸಲ್ಲಿಸಿದ ಮೇಲೆ, ನಿಮ್ಮ ಪೂರ್ಣಗೊಂಡ ಅಂಕಗಳನ್ನು ಪಡೆಯಲು "ಪೂರ್ಣಗೊಂಡಿದೆ ಎಂದು ಗುರುತಿಸಿ" ಬಟನ್ ಕ್ಲಿಕ್ ಮಾಡಿ.',
  "Once you click “Mark as Complete,” you will not be able to participate in the contest again.": 'ನೀವು "ಪೂರ್ಣಗೊಂಡಿದೆ ಎಂದು ಗುರುತಿಸಿದ" ನಂತರ, ನೀವು ಮತ್ತೆ ಸ್ಪರ್ಧೆಯಲ್ಲಿ ಭಾಗವಹಿಸಲು ಸಾಧ್ಯವಿಲ್ಲ.',
  "Upon submission, 3 points will be added to your account for overall evaluation.": 'ಸಲ್ಲಿಕೆಯಾದ ನಂತರ, ಒಟ್ಟು ಮೌಲ್ಯಮಾಪನಕ್ಕಾಗಿ ನಿಮ್ಮ ಖಾತೆಗೆ 3 ಅಂಕಗಳನ್ನು ಸೇರಿಸಲಾಗುತ್ತದೆ.',
  "This category will also have a separate Top-3 special recognition.": 'ಈ ವರ್ಗಕ್ಕೆ ವಿಶೇಷ Top-3 ಗೌರವಗಳೂ ಇರಲಿವೆ.',
  "If you have more than one suggestion for the Kaizen suggestion, they are also accepted. For this, please contact Mr. Ashwin – 8904799083, Quality Department.": 'ನಿಮಗೆ ಕೈಝೆನ್ ಸಲಹೆಗೆ ಒಂದಕ್ಕಿಂತ ಹೆಚ್ಚು ಸಲಹೆಗಳಿದ್ದರೆ, ಅವು ಸಹ ಸ್ವೀಕರಿಸಲಾಗುವುದು. ಇದರಿಗಾಗಿ ದಯವಿಟ್ಟು ಶ್ರೀ ಅಶ್ವಿನ್ ಅವರನ್ನು ಸಂಪರ್ಕಿಸಿ - 8904799083, ಗುಣಮಟ್ಟ ವಿಭಾಗ.'
  };

  return translations[inst] || inst;
}

export default PlaceholderTask;
