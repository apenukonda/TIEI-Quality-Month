import React, { useContext, useState, useEffect } from 'react';
import { ADVANCED_MODULES } from '../constants';
import { ChevronLeftIcon, XCircleIcon } from './icons';
import { AppContext } from '../context/AppContext';
import { Page, VideoModule, VideoItem } from '../types';

const KnowledgeCentrePage: React.FC = () => {
  const { setCurrentPage, language, t } = useContext(AppContext);
  const [selectedModule, setSelectedModule] = useState<VideoModule | null>(null);
  // pageIndex controls which page of videos is visible in the modal (3 items per page)
  const [pageIndex, setPageIndex] = useState(0);

  useEffect(() => {
    // reset page whenever a new module is selected
    setPageIndex(0);
  }, [selectedModule]);

  return (
  <div className="min-h-screen p-6 pt-20 bg-gray-50">
      <div className="max-w-6xl mx-auto">
  <button data-kn-skip onClick={() => setCurrentPage(Page.DASHBOARD)} className="flex items-center gap-2 text-black hover:text-red-500 mb-3">
          <ChevronLeftIcon className="w-6 h-6" />
          {t('back')}
        </button>

        <header className="mb-8 text-center">
          <h1 className="text-4xl font-extrabold text-gray-900">{t('knowledge_centre') || (language === 'kn' ? 'ಜ್ಞಾನ ಕೇಂದ್ರ' : 'Knowledge Centre')}</h1>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {ADVANCED_MODULES.map((module: VideoModule) => (
            <div key={module.id} className="bg-white rounded-2xl shadow-md overflow-hidden">
              <div className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-sm font-semibold text-red-600 mb-1">{module.id}</div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{language === 'kn' ? (module.titleKn || module.title) : module.title}</h3>
                    <p className="text-sm text-gray-500">{module.videos.length} {t('videos') || (language === 'kn' ? 'ವೀಡಿಯೋಗಳು' : 'videos')}</p>
                  </div>
                  <div className="ml-4 flex items-center">
                    <button onClick={() => setSelectedModule(module)} className="px-4 py-2 bg-red-600 text-white rounded-lg">{t('Open') || (language === 'kn' ? 'ತೆರೆ' : 'Open')}</button>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-1">
                {module.videos.slice(0,4).map((v: VideoItem) => (
                  <a key={v.id} href={`https://www.youtube.com/watch?v=${v.id}`} target="_blank" rel="noopener noreferrer" className="block">
                    <img src={`https://img.youtube.com/vi/${v.id}/mqdefault.jpg`} alt={v.title} className="w-full h-28 object-cover" />
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      {selectedModule && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-full sm:max-w-3xl w-full text-left overflow-hidden">
            <button onClick={() => setSelectedModule(null)} className="absolute top-4 right-4 text-gray-400 hover:text-red-500 z-10">
              <XCircleIcon className="w-8 h-8" />
            </button>
              <div className="p-6">
              <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">{language === 'kn' ? (selectedModule.titleKn || selectedModule.title) : selectedModule.title}</h2>
              <p className="text-sm text-gray-500 mb-4">{selectedModule.videos.length} {t('videos') || (language === 'kn' ? 'ವೀಡಿಯೋಗಳು' : 'videos')}</p>
              <div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {selectedModule.videos
                    .slice(pageIndex * 3, pageIndex * 3 + 3)
                    .map((vid: VideoItem) => (
                      <a key={vid.id} href={`https://www.youtube.com/watch?v=${vid.id}`} target="_blank" rel="noopener noreferrer" className="block bg-gray-100 rounded-lg overflow-hidden shadow-sm hover:shadow-lg transition-all">
                        <div className="flex items-center gap-4 p-3">
                          <img src={`https://img.youtube.com/vi/${vid.id}/mqdefault.jpg`} alt={vid.title} className="w-24 sm:w-36 h-14 sm:h-20 object-cover rounded-md flex-shrink-0" />
                          <div>
                            <div className="font-semibold text-gray-900">{vid.title}</div>
                            <div className="text-sm text-gray-500">{t('Play on YouTube') || (language === 'kn' ? 'YouTube ನಲ್ಲಿ ಆಡಿ' : 'Play on YouTube')}</div>
                          </div>
                        </div>
                      </a>
                    ))}
                </div>

                {/* pagination buttons for modules with more than 3 videos */}
                {selectedModule.videos.length > 3 && (
                  <div className="flex justify-center gap-2 mt-4">
                    {Array.from({ length: Math.ceil(selectedModule.videos.length / 3) }).map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setPageIndex(i)}
                        className={`px-3 py-1 rounded-full border ${pageIndex === i ? 'bg-red-600 text-white border-red-600' : 'bg-white text-gray-700 border-gray-200'} hover:scale-105 transition-transform`}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KnowledgeCentrePage;