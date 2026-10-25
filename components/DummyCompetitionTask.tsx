import React, { useContext, useState } from 'react';
import { AppContext } from '../context/AppContext';
import { Page } from '../types';
import { ChevronLeftIcon } from './icons';

interface DummyCompetitionTaskProps {
  taskId: string;
  title: string;
}

const DummyCompetitionTask: React.FC<DummyCompetitionTaskProps> = ({ taskId, title }) => {
  const { setCurrentPage, language, t } = useContext(AppContext);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 pt-24 text-center animate-fade-in">
      <button data-kn-skip onClick={() => setCurrentPage(Page.DASHBOARD)} className="absolute top-20 left-4 flex items-center gap-2 text-black hover:text-red-500">
        <ChevronLeftIcon className="h-6 w-6" />{t('back')}
      </button>
      <div className="w-full max-w-2xl">
        <h1 className="mt-8 mb-4 text-4xl font-bold">{title}</h1>
        <div className="rounded-2xl bg-white p-8 text-left shadow-xl">
          <h2 className="mb-4 text-center text-2xl font-semibold">Instructions</h2>
          <ul className="list-disc space-y-3 pl-5 text-black">
            {(language === 'kn'
              ? [
                  'ಬ್ರೈನ್ ಬೂಸ್ಟ್ ಸ್ಪರ್ಧೆಯ ಅಂಕಗಳ ಆಧಾರದ ಮೇಲೆ ಸ್ಪರ್ಧಿಗಳನ್ನು ಆಯ್ಕೆ ಮಾಡಲಾಗುತ್ತದೆ.',
                  'ಟೀಮ್ ಮೆಂಬರ್ ಲೆವೆಲ್‌ನಿಂದ ಗ್ರೂಪ್ ಲೀಡರ್ ಲೆವೆಲ್‌ವರೆಗೆ ಪ್ರತಿ ವರ್ಗದಿಂದ ಆಯ್ಕೆ ಮಾಡಲಾಗುತ್ತದೆ.',
                  'ಎಲ್ಲಾ ಬ್ರೈನ್ ಬೂಸ್ಟ್ ಸಲ್ಲಿಕೆಗಳು 30 ನವೆಂಬರ್ 2026 ರಂದು ಪೂರ್ಣಗೊಂಡ ನಂತರ ಅರ್ಹತಾ ಕಟ್-ಆಫ್ ಅಂಕಗಳನ್ನು ನಿರ್ಧರಿಸಲಾಗುತ್ತದೆ.',
                  'ಆಯ್ಕೆಯಾದ ಸ್ಪರ್ಧಿಗಳು ಮೊದಲ ರಸಪ್ರಶ್ನೆ ಸುತ್ತಿನಲ್ಲಿ ಸ್ಪರ್ಧಿಸುತ್ತಾರೆ.',
                  'ಅರ್ಹತೆ ಪಡೆದವರು ವಿಜೇತರನ್ನು ನಿರ್ಧರಿಸಲು ಎರಡನೇ ಸುತ್ತಿನಲ್ಲಿ ಸ್ಪರ್ಧಿಸುತ್ತಾರೆ.',
                  'ವಿಷಯಗಳು: ಟೊಯೋಟಾ ಪ್ರೊಡಕ್ಷನ್ ಸಿಸ್ಟಮ್ (TPS), ಕ್ವಾಲಿಟಿ ಮ್ಯಾನೇಜ್‌ಮೆಂಟ್ ಸಿಸ್ಟಮ್ (QMS), ಮತ್ತು ಎಂಜಿನ್ ಕಾರ್ಯವಿಧಾನಗಳು.',
                ]
              : [
                  'Participants will be selected based on their scores in the Brain Boost competition.',
                  'Selection will be made from each category, from Team Member Level to Group Leader Level.',
                  'The qualifying cut-off score will be decided after all Brain Boost submissions are completed on 30 November 2026.',
                  'Selected participants will compete in the first quiz round.',
                  'Qualified participants will compete in the second round to determine the winners.',
                  'Topics: Toyota Production System (TPS), Quality Management System (QMS), and engine functions.',
                ]).map((instruction) => <li key={instruction}>{instruction}</li>)}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default DummyCompetitionTask;
