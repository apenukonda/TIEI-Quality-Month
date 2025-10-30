import React, { useContext, useEffect, useState, useRef } from 'react';
import { AppContext } from '../context/AppContext';
// KText removed — use inline language ternaries
import { ChevronLeftIcon } from './icons';
import { Page, Department } from '../types';

const TopPerformers: React.FC = () => {
  const { getTopScores, setCurrentPage, t, currentUser } = useContext(AppContext);
  const [scores, setScores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [departmentFilter, setDepartmentFilter] = useState<string | undefined>(undefined);

  // Local ProfileMenu component (hover dropdown)
  const ProfileMenu: React.FC = () => {
    const { currentUser, language: lang, setLanguage, logout, t } = useContext(AppContext);
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
      const onDocClick = (e: MouseEvent) => {
        if (!ref.current) return;
        if (!ref.current.contains(e.target as Node)) setOpen(false);
      };
      document.addEventListener('click', onDocClick);
      return () => document.removeEventListener('click', onDocClick);
    }, []);

    const initials = currentUser?.name ? currentUser.name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase() : 'U';

    return (
      <div ref={ref} className="relative">
        <button
          onMouseEnter={() => setOpen(true)}
          aria-expanded={open}
          aria-label="Profile menu"
          className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-white font-bold text-sm border border-white/10"
        >
          {initials}
        </button>

        {open && (
          <div onMouseLeave={() => setOpen(false)} className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg z-50 overflow-hidden">
            <div className="p-3 border-b border-gray-100">
              <div className="font-semibold text-gray-900">{currentUser?.name}</div>
              <div className="text-xs text-gray-500">{currentUser?.designation || currentUser?.department}</div>
            </div>

            <div className="p-2">
              <div className="text-xs text-gray-500 px-2 pb-1">{t('language') || (lang === 'kn' ? 'Kannada' : 'Language')}</div>
              <div className="flex gap-2 px-2">
                <button onClick={() => { setLanguage('en'); setOpen(false); }} className={`flex-1 py-2 rounded text-sm ${lang === 'en' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-800'}`}>English</button>
                <button onClick={() => { setLanguage('kn'); setOpen(false); }} className={`flex-1 py-2 rounded text-sm ${lang === 'kn' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-800'}`}>Kannada</button>
              </div>
            </div>

            <div className="p-3 border-t border-gray-100">
              <button onClick={logout} className="w-full py-2 rounded bg-red-600 text-white font-semibold">{t('logout')}</button>
            </div>
          </div>
        )}
      </div>
    );
  };

  useEffect(() => {
    setLoading(true);
    getTopScores(departmentFilter).then(data => {
      setScores((data || []).slice(0, 5));
      setLoading(false);
    });
  }, [getTopScores, departmentFilter]);

  return (
    <div className="min-h-screen p-6 pt-24 relative">
      {/* Top-right fixed profile/score */}
      <div className="absolute top-4 sm:top-6 right-3 sm:right-6 flex items-center gap-3">
        {/* score block: label above, centered pill with the number */}
        <div className="flex flex-col items-end mr-2 text-right">
          <span className="text-xs text-gray-600">{t('score')}</span>
          <span className="mt-1 inline-flex items-center justify-center px-3 py-1 rounded-xl bg-gray-100 text-gray-900 font-semibold text-sm shadow-sm">{currentUser?.score ?? 0}</span>
        </div>
        <ProfileMenu />
      </div>

      <button data-kn-skip onClick={() => setCurrentPage(Page.DASHBOARD)} className="flex items-center gap-2 text-black hover:text-red-500 mb-6">
        <ChevronLeftIcon className="w-6 h-6" />
        {t('back')}
      </button>

      <div className="max-w-4xl mx-auto bg-white rounded-2xl p-0 shadow-lg overflow-hidden">
        <div className="bg-blue-600 p-6 text-white">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-base sm:text-2xl md:text-3xl font-extrabold">{t('top_performers')}</h1>
              <div className="relative">
                <select
                  value={departmentFilter ?? ''}
                  onChange={(e) => setDepartmentFilter(e.target.value || undefined)}
                  className="appearance-none bg-white text-blue-700 px-2 py-1 sm:px-3 sm:py-2 rounded-lg shadow text-xs sm:text-sm pr-8 min-w-[120px] w-[110px] sm:w-auto"
                  aria-label="Filter by department"
                  style={{maxWidth: '60vw'}}
                >
                  <option value="">All Departments</option>
                  {Object.values(Department).map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">▾</div>
              </div>
            </div>
            <div className="grid grid-cols-3 items-end gap-3">
                {Array.from([1,0,2]).map((idx, pos) => {
                const s = scores[idx];
                const isCenter = pos === 1;
                // responsive podium sizes: narrower on mobile, slightly taller side columns on mobile
                // lowered side podium heights a little to reduce their height slightly
                const podiumHeight = isCenter ? 'h-24 sm:h-36' : 'h-20 sm:h-30';
                const podiumWidth = isCenter ? 'w-24 sm:w-36' : 'w-16 sm:w-28';
                const label = pos === 1 ? '1st' : pos === 0 ? '2nd' : '3rd';
                const badgeStyle: React.CSSProperties = label === '1st'
                  ? { backgroundColor: '#FFD700', color: '#000' }
                  : label === '2nd'
                    ? { backgroundColor: '#C0C0C0', color: '#000' }
                    : { backgroundColor: '#B87333', color: '#fff' };
                return (
                  <div key={idx} className="flex flex-col items-center">
                    <div className="relative">
                      <div className="w-12 sm:w-16 h-12 sm:h-16 rounded-full bg-white flex items-center justify-center font-bold text-xs sm:text-sm shadow-md" style={{ color: '#000' }}>
                        {s ? (s.name || '').split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase() : 'U'}
                      </div>
                      <div className="absolute -top-2 -right-1 font-bold text-xs px-2 py-1 rounded-full shadow" style={badgeStyle}>{label}</div>
                    </div>
                    <div className="mt-1 text-xs sm:text-sm opacity-90 text-center">{s?.name || ''}</div>
                    <div className={`mt-2 ${podiumWidth} ${podiumHeight} bg-white/20 rounded-xl flex items-end justify-center`}> 
                      <div className="mb-2 text-2xl sm:text-3xl font-extrabold">{s ? s.score : '-'}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="bg-white p-3">
          <div className="max-w-3xl mx-auto">

            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <ul>
                {scores.map((user, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 p-3 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="text-gray-500 font-bold w-6 text-center">{i+1}</div>
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-700">{user?.name ? user.name.charAt(0).toUpperCase() : 'U'}</div>
                      <div>
                        <div className="font-semibold text-sm">{user.name}</div>
                        <div className="text-[11px] text-gray-500">{user.department}</div>
                      </div>
                    </div>
                    <div className="text-sm font-extrabold text-gray-900">{user.score}</div>
                  </li>
                ))}
              </ul>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default TopPerformers;
