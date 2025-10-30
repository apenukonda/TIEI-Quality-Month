import React, {
  useState,
  useContext,
  useEffect,
  useRef,
  useCallback,
} from "react";
import supabaseClient from '../context/supabaseClient';
import { AppContext } from "../context/AppContext";
import { Page, Question } from "../types";
import Quiz from "./Quiz";
import { ADVANCED_MODULES, M2_TASK3_QUIZ, M2_TASK1_QUIZ } from "../constants";
import { M2_TASK3_QUIZ_KN, M2_TASK1_QUIZ_KN, M2_TASK2_QUIZ_KN } from "../constants_kn";
import { M2_TASK4_QUIZ_KN } from "../constants_kn";
import { M2_TASK2_QUIZ } from "../constants";
import { M2_TASK4_QUIZ } from "../constants";
import {
  ChevronLeftIcon,
  PlayIcon,
  CheckIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "./icons";

type View =
  | "instructions"
  | "modules"
  | "videos"
  | "player"
  | "quiz"
  | "completed";

interface VideoProgress {
  [videoId: string]: {
    watchedSeconds: number;
    isComplete: boolean;
  };
}

const VideoTask: React.FC = () => {
  const {
    currentUser,
    setCurrentPage,
    updateTaskCompletion,
  updateModuleTask,
    getVideoProgress,
    updateVideoProgress,
    addScore,
    t,
    language,
    selectedModuleIndex,
    setSelectedModuleIndex,
    getTaskScore,
    fetchUserTasks,
    setTaskCompletedSteps,
  } = useContext(AppContext);
  

  // Helper: ensure question objects include Kannada fields when language === 'kn'
  const attachKannadaFields = (qs: Question[] | undefined) => {
    if (!qs) return qs || [];
    // no-op

    return qs.map(qOrig => {
      const q = { ...(qOrig as any) } as any;
      try {
        // Fill textKn: prefer existing, then translation map, then dash-split fallback
        if (language === 'kn') {
          if (!q.textKn || q.textKn === q.text) {
            const translated = t(q.text || '');
            if (translated && translated !== q.text) {
              q.textKn = translated;
            } else {
              const parts = (q.text || '').split(/[-–—]/).map((s: string) => s.trim()).filter(Boolean);
              if (parts.length >= 2) q.textKn = parts[parts.length - 1];
            }
          }
          // Options: prefer optionsKn if present, otherwise try translations/dash-split per option
          if (!Array.isArray(q.optionsKn) || q.optionsKn.length !== q.options.length) {
            q.optionsKn = q.options.map((opt: string, idx: number) => {
              // If an optionsKn exists at idx and is different, keep it
              if (Array.isArray(qOrig.optionsKn) && qOrig.optionsKn[idx]) return qOrig.optionsKn[idx];
              const translatedOpt = t(opt);
              if (translatedOpt && translatedOpt !== opt) return translatedOpt;
              const optParts = opt.split(/[-–—]/).map((s: string) => s.trim()).filter(Boolean);
              if (optParts.length >= 2) return optParts[optParts.length - 1];
              return opt;
            });
          }
        }
      } catch (e) {
        // Defensive: if anything fails, return shallow copy
        return { ...(qOrig as any) } as Question;
      }
      // end per-question processing
      return q as Question;
    });
  };
  const [view, setView] = useState<View>("instructions");
  const [currentModuleIndex, setCurrentModuleIndex] = useState(0);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [videoProgress, setVideoProgress] = useState<VideoProgress>({});
  const [videoDuration, setVideoDuration] = useState(0);
  const [currentQuizQuestions, setCurrentQuizQuestions] = useState<Question[]>([]);
  
  const [startedQuiz, setStartedQuiz] = useState(false);
  const [showBackWarning, setShowBackWarning] = useState(false);
  const [currentQuizScore, setCurrentQuizScore] = useState(0);
  const [showResultModal, setShowResultModal] = useState(false);
  const [resultScore, setResultScore] = useState<number | null>(null);
  // Track per-video quiz scores
  const [quizScores, setQuizScores] = useState<{ [videoId: string]: number }>(
    {}
  );

  const QUESTIONS_PER_VIDEO = 7;

  // Helper: fetch existing stored task6 score (if any)
  const getExistingTask6Score = async (): Promise<number> => {
    if (!currentUser) return 0;
    try {
      const { data, error } = await supabaseClient
        .from('user_tasks')
        .select('score')
        .eq('user_id', currentUser.id)
        .eq('task_id', 'task6')
        .single();
      if (error) return 0;
      return (data && data.score) ? Number(data.score) : 0;
    } catch (e) {
      return 0;
    }
  };

  // Helper: try to compute total from module progress tables if present
  const getModuleProgressTotal = async (): Promise<number> => {
    if (!currentUser) return 0;
    const tables = ['module_m1_progress', 'module_m2_progress', 'module_m3_progress'];
    let sum = 0;
    for (const tbl of tables) {
      try {
        const { data, error } = await supabaseClient.from(tbl).select('score').eq('user_id', currentUser.id);
        if (!error && data) sum += (data as any[]).reduce((s, r) => s + (r.score || 0), 0);
      } catch (e) {
        // ignore table errors
      }
    }
    return sum;
  };

  const getRpcModuleName = (moduleId?: string) => {
    if (!moduleId) return '';
    return moduleId.toLowerCase() === 'm1' ? 'm1' : moduleId.toLowerCase() === 'm2' ? 'm2' : moduleId.toLowerCase() === 'm3' ? 'm3' : '';
  };

  const playerRef = useRef<any>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);

  // (currentModule/currentVideo are declared later in the file; effects reference module by index)

  const fetchInitialProgress = useCallback(async () => {
    if (currentUser) {
      const progress = await getVideoProgress(currentUser.id);
      const typedProgress = progress as VideoProgress;
      setVideoProgress(typedProgress || {});
      // Do NOT call updateTaskCompletion here; score should only update after quiz completion
    }
  }, [currentUser, getVideoProgress, updateTaskCompletion]);

  useEffect(() => {
    fetchInitialProgress();
    // If a module was pre-selected (from Knowledge Centre), open its videos
    if (typeof selectedModuleIndex === 'number' && selectedModuleIndex !== null) {
      setCurrentModuleIndex(selectedModuleIndex);
      setView('videos');
      // Clear the selection to avoid re-opening on remount
      setSelectedModuleIndex(null);
    }
  }, [fetchInitialProgress]);

  // Fix: Reset quiz questions when language changes for M2 Task 1, Task 2, and Task 3
  useEffect(() => {
    if (view === 'quiz' && currentModule?.id === 'M2') {
      if (currentVideoIndex === 0) {
        const quizArr = language === 'kn' ? M2_TASK1_QUIZ_KN : M2_TASK1_QUIZ;
        setCurrentQuizQuestions([...quizArr]);
      } else if (currentVideoIndex === 1) {
        const quizArr = language === 'kn' ? M2_TASK2_QUIZ_KN : M2_TASK2_QUIZ;
        setCurrentQuizQuestions([...quizArr]);
      } else if (currentVideoIndex === 2) {
        const quizArr = language === 'kn' ? M2_TASK3_QUIZ_KN : M2_TASK3_QUIZ;
        setCurrentQuizQuestions([...quizArr]);
      } else if (currentVideoIndex === 3) {
        const quizArr = language === 'kn' ? M2_TASK4_QUIZ_KN : M2_TASK4_QUIZ;
        setCurrentQuizQuestions([...quizArr]);
      }
    }
    // eslint-disable-next-line
  }, [language, currentModuleIndex]);

  // Ensure non-M2 quizzes (e.g., M1) re-render their displayed text when the
  // language changes, without resetting quiz progress. We do this by
  // shallow-cloning the questions array and its objects so the Quiz component
  // receives a new prop reference and re-renders localized strings, while the
  // Quiz component itself preserves the currentQuestionIndex/score because
  // it resets only on quizId changes.
  useEffect(() => {
    if (view === 'quiz' && currentModule?.id && currentModule.id !== 'M2') {
      setCurrentQuizQuestions(prev => {
        if (!prev || prev.length === 0) return prev;
        try {
          return attachKannadaFields(prev as Question[]);
        } catch (e) {
          // Fallback to a shallow clone if attach fails for any reason
          return (prev as Question[]).map(q => ({ ...(q as Question) }));
        }
      });
    }
    // Intentionally run whenever language changes
  }, [language]);

  // Initialize/reset quiz questions when entering the quiz view or when the current video index changes
  useEffect(() => {
    if (view === 'quiz' && currentModule?.id === 'M2') {
      // Same selection logic as above but triggered on view/index changes to ensure initial language is respected
      if (currentVideoIndex === 0) {
        const quizArr = language === 'kn' ? M2_TASK1_QUIZ_KN : M2_TASK1_QUIZ;
        setCurrentQuizQuestions(attachKannadaFields([...quizArr]));
      } else if (currentVideoIndex === 1) {
        const quizArr = language === 'kn' ? M2_TASK2_QUIZ_KN : M2_TASK2_QUIZ;
        setCurrentQuizQuestions(attachKannadaFields([...quizArr]));
      } else if (currentVideoIndex === 2) {
        const quizArr = language === 'kn' ? M2_TASK3_QUIZ_KN : M2_TASK3_QUIZ;
        setCurrentQuizQuestions(attachKannadaFields([...quizArr]));
      } else if (currentVideoIndex === 3) {
        const quizArr = language === 'kn' ? M2_TASK4_QUIZ_KN : M2_TASK4_QUIZ;
        setCurrentQuizQuestions(attachKannadaFields([...quizArr]));
      }
    }
    // We intentionally include view and currentVideoIndex so this runs on entering quiz and when index changes
  }, [view, currentVideoIndex, currentModuleIndex, language]);

  // Effect to manage the YouTube Player lifecycle
  useEffect(() => {
    // If not in player view, destroy any existing player and return early
    if (view !== 'player') {
      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        playerRef.current.destroy();
        playerRef.current = null;
      }
      return;
    }

    const currentModule = ADVANCED_MODULES[currentModuleIndex];
    const currentVideo = currentModule.videos[currentVideoIndex];
    const videoId = currentVideo.id;

    const createPlayer = () => {
      if (!playerContainerRef.current || playerRef.current) return;
      playerRef.current = new (window as any).YT.Player(playerContainerRef.current, {
        videoId,
        playerVars: { autoplay: 1, controls: 1, modestbranding: 1, rel: 0 },
        events: {
          onReady: (event: any) => setVideoDuration(event.target.getDuration()),
          onStateChange: (event: any) => {
            if (event.data === (window as any).YT.PlayerState.ENDED) {
              const duration = event.target.getDuration();
              updateVideoProgress(videoId, duration, true);
              setVideoProgress(prev => ({
                ...prev,
                [videoId]: {
                  ...prev[videoId],
                  watchedSeconds: duration,
                  isComplete: true,
                }
              }));
            }
          }
        }
      });
    };

    if ((window as any).YT && (window as any).YT.Player) {
      createPlayer();
    } else {
      (window as any).onYouTubeIframeAPIReady = createPlayer;
      if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        document.body.appendChild(tag);
      }
    }

    return () => {
      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [view, currentVideoIndex]);

  // Effect for tracking progress periodically
  useEffect(() => {
    if (view !== "player") return;

    const progressInterval = setInterval(() => {
      if (
        playerRef.current &&
        typeof playerRef.current.getCurrentTime === "function" &&
        playerRef.current.getPlayerState() === 1
      ) {
        // 1 = playing
        const currentTime = Math.floor(playerRef.current.getCurrentTime());
        const currentModule = ADVANCED_MODULES[currentModuleIndex];
        const currentVideo = currentModule.videos[currentVideoIndex];
        const videoId = currentVideo.id;

        setVideoProgress((prev) => {
          const currentProgress = prev[videoId] || {
            watchedSeconds: 0,
            isComplete: false,
          };
          if (currentTime > currentProgress.watchedSeconds) {
            updateVideoProgress(
              videoId,
              currentTime,
              currentProgress.isComplete
            );
            return {
              ...prev,
              [videoId]: { ...currentProgress, watchedSeconds: currentTime },
            };
          }
          return prev;
        });
      }
    }, 2000);

    return () => clearInterval(progressInterval);
  }, [view, currentVideoIndex, updateVideoProgress]);

  const selectModule = (index: number) => {
    setCurrentModuleIndex(index);
    setCurrentVideoIndex(0);
    setView("videos");
  };

  const selectVideo = (index: number) => {
    setCurrentVideoIndex(index);
    setCurrentQuizQuestions([]); // Reset quiz questions when selecting a new video
    setStartedQuiz(false); // Reset quiz started flag
    setCurrentQuizScore(0); // Reset quiz score
    setView("player");
  };

  const getRandomQuestions = (questions: Question[], count: number) => {
    const shuffled = [...questions].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  };

  const handleQuizComplete = useCallback(
    async (score: number) => {
      const currentModule = ADVANCED_MODULES[currentModuleIndex];
      const currentVideo = currentModule.videos[currentVideoIndex];
      const videoId = currentVideo.id;

      // Mark video as complete and update progress
      await updateVideoProgress(
        videoId,
        videoProgress[videoId]?.watchedSeconds || videoDuration,
        true
      );
      // After we've updated the DB, fetch authoritative progress to avoid stale state
      try {
        let freshProgress: VideoProgress = {};
        if (currentUser) {
          const fetched = await getVideoProgress(currentUser.id);
          freshProgress = (fetched as VideoProgress) || {};
        }

        // Ensure the current video is marked complete in the local snapshot
        const updatedVP = {
          ...freshProgress,
          [videoId]: {
            watchedSeconds: freshProgress[videoId]?.watchedSeconds || videoDuration,
            isComplete: true,
          },
        };
        setVideoProgress(updatedVP);

  // Persist cumulative per-task score using authoritative progress
  const questionsPerVideo = QUESTIONS_PER_VIDEO;
        const completedVideos = Object.values(updatedVP).filter(
          (p: { isComplete: boolean }) => p.isComplete
        ).length;

        // Build the updated per-video scores map synchronously so we can compute
        // an authoritative total and persist it exactly once. Avoid calling
        // getTaskScore() + addition because that can lead to races or double
        // counting if multiple updates happen concurrently.
        const updatedScoresMap = { ...(quizScores || {}), [videoId]: score };
        setQuizScores(updatedScoresMap);

        try {
          const totalScore = Object.values(updatedScoresMap).reduce((sum: number, s: number) => sum + (s || 0), 0);
          const completedSteps = completedVideos * questionsPerVideo;
          console.debug('handleQuizComplete: persisting task6', { videoId, score, updatedScoresMap, totalScore, completedSteps });

          // Persist per-module progress (module_m{n}_progress). This RPC will
          // set the appropriate taskX_completed=true and taskX_score to the
          // passed score for the currently authenticated user.
          try {
            const moduleId = currentModule?.id || '';
            const moduleName = getRpcModuleName(moduleId);
            console.debug('VideoTask about to call updateModuleTask', { moduleId, moduleName, videoIndex: currentVideoIndex, score, userId: currentUser?.id });
            if (moduleName && typeof updateModuleTask === 'function') {
              try {
                const res = await updateModuleTask(moduleName, currentVideoIndex + 1, true, score);
                console.debug('VideoTask updateModuleTask returned', { res });
                // If module RPC returned successfully, refresh the per-task row
                // by calling updateTaskCompletion with an authoritative total
                // computed from module progress so the dashboard card updates.
                try {
                  if (currentUser) {
                    // Optimistically update the UI progress for task6 so the
                    // EventCard progress bar reacts immediately while we
                    // refresh the authoritative rows in the background.
                    try { if (typeof (fetchUserTasks) === 'function') await fetchUserTasks(currentUser.id); } catch(e) { console.debug('fetchUserTasks failed', e); }
                    try { if (typeof (setTaskCompletedSteps) === 'function') setTaskCompletedSteps('task6', completedSteps); } catch(e) { console.debug('setTaskCompletedSteps failed', e); }
                  }
                } catch (e) {
                  console.debug('Failed to fetchUserTasks after module RPC (non-fatal)', e);
                }
              } catch (e) {
                console.debug('updateModuleTask failed (non-fatal)', e);
              }
            }
          } catch (e) {
            console.error('Error calling updateModuleTask RPC:', e);
          }

          // Compute authoritative total: prefer the larger of our computed
          // totalScore (sum of per-video quiz scores) and any score aggregated
          // in the module progress tables (to avoid accidental decreases).
          try {
            // Do not pass the combined authoritative total to updateTaskCompletion; pass
            // the per-task totalScore (sum of quiz scores) so the DB function will
            // upsert the task6 row correctly. The DB will recompute profiles.score
            // by summing user_tasks and comparing with module progress as needed.
            // For module quizzes (task6) we only update the module progress table here.
            // The profile total will be recomputed server-side by triggers/helper functions.
            // Do NOT call updateTaskCompletion for task6 to avoid updating profiles directly.
          } catch (e) {
            // If updateModuleTask fails, do not update profiles directly here.
            // Module progress was attempted; the DB trigger/helper will recompute profiles.score.
            console.debug('updateModuleTask failed; skipping direct profile update for task6', e);
          }
        } catch (err) {
          console.error('Error persisting task6 score after quiz completion:', err);
        }
        const completedCountNow = Object.values(updatedVP).filter(
          (p) => (p as { isComplete: boolean }).isComplete
        ).length;
        const totalVideos = ADVANCED_MODULES.reduce((sum, module) => sum + module.videos.length, 0);
        if (completedCountNow === totalVideos) {
          setView('completed');
        } else {
          setView('videos');
        }
      } catch (err) {
        console.error('Error fetching fresh video progress after quiz completion:', err);
        // fallback to previous behavior: update local progress and move to videos view
        setVideoProgress((prev) => ({
          ...prev,
          [videoId]: { watchedSeconds: prev[videoId]?.watchedSeconds || videoDuration, isComplete: true },
        }));
        setQuizScores((prev) => ({ ...prev, [videoId]: score }));
        setView('videos');
      }
    },
    [
      currentModuleIndex,
      currentVideoIndex,
      videoDuration,
      updateTaskCompletion,
      updateVideoProgress,
      videoProgress,
      currentQuizQuestions,
    ]
  );

  const handleBack = () => {
    if (view === "modules" || view === "completed" || view === "instructions") {
      setCurrentPage(Page.DASHBOARD);
    } else if (view === "videos") {
      setView("modules");
    } else if (view === "quiz" && startedQuiz) {
      setShowBackWarning(true);
    } else {
      setView("videos");
    }
  };
  const confirmBack = async () => {
    setShowBackWarning(false);
    
    const currentModule = ADVANCED_MODULES[currentModuleIndex];
    const currentVideo = currentModule.videos[currentVideoIndex];
    const videoId = currentVideo.id;
    const questionsPerVideo = QUESTIONS_PER_VIDEO; // Assuming 7 questions per video

    // 1. Save the current video's score locally
    setQuizScores((prevScores) => ({ ...prevScores, [videoId]: currentQuizScore }));

    // 2. Mark the video as complete and update progress (assuming they completed the video before the quiz)
    // We use videoDuration here to ensure completion is marked even if the interval didn't run last
    updateVideoProgress(
      videoId,
      videoProgress[videoId]?.watchedSeconds || videoDuration,
      true
    );
    
    // Update local video progress state
    setVideoProgress((prev) => ({
      ...prev,
      [videoId]: {
        watchedSeconds: prev[videoId]?.watchedSeconds || videoDuration,
        isComplete: true,
      },
    }));

    // 3. Compute and persist the new total task score
    // Compute updated per-video scores map and persist a single authoritative
    // total score. This avoids fetching the stored score and adding to it,
    // which could double-count if other updates are inflight.
    try {
      const updatedScores = { ...(quizScores || {}), [videoId]: currentQuizScore };
      setQuizScores(updatedScores);

      const allVideoIds = ADVANCED_MODULES.flatMap((m) => m.videos.map((v) => v.id));
      const completedCount = allVideoIds.filter((id) => id === videoId || videoProgress[id]?.isComplete).length;
      const completedSteps = completedCount * questionsPerVideo;
      const totalScore = Object.values(updatedScores).reduce((sum: number, s: number) => sum + (s || 0), 0);

      console.debug('confirmBack: persisting task6', { videoId, currentQuizScore, totalScore, completedSteps });
      try {
        const moduleId = currentModule?.id || '';
        const moduleName = getRpcModuleName(moduleId);
        console.debug('confirmBack calling updateModuleTask', { moduleId, moduleName, videoIndex: currentVideoIndex, currentQuizScore, userId: currentUser?.id });
        if (moduleName && typeof updateModuleTask === 'function') {
          try {
            const res = await updateModuleTask(moduleName, currentVideoIndex + 1, true, currentQuizScore);
            console.debug('confirmBack updateModuleTask returned', { res });
              // After persisting module progress, update the task6 per-task row
              // so the EventCard progress (tasks.completedSteps) refreshes.
              try {
                if (currentUser) {
                  try { if (typeof (fetchUserTasks) === 'function') await fetchUserTasks(currentUser.id); } catch(e) { console.debug('confirmBack fetchUserTasks failed', e); }
                  try { if (typeof (setTaskCompletedSteps) === 'function') setTaskCompletedSteps('task6', completedSteps); } catch(e) { console.debug('confirmBack setTaskCompletedSteps failed', e); }
                }
              } catch (e) {
                console.debug('confirmBack: failed to fetchUserTasks after module RPC (non-fatal)', e);
              }
          } catch (e) {
            console.debug('updateModuleTask failed (non-fatal)', e);
          }
        }

        // Build an authoritative snapshot of video progress including this video as complete
        const updatedVP = { ...(videoProgress || {}), [videoId]: { watchedSeconds: videoProgress[videoId]?.watchedSeconds || videoDuration, isComplete: true } };
        const completedVideos = Object.values(updatedVP).filter((p: any) => p.isComplete).length;
        const completedStepsNow = completedVideos * questionsPerVideo;

        try {
          // We persist module table via updateModuleTask above.
          // Do NOT call updateTaskCompletion for task6 here; profiles are recomputed by DB triggers.
          console.debug('confirmBack: updateModuleTask persisted; skipping updateTaskCompletion for task6');
        } catch (e) {
          console.debug('confirmBack: skipping updateTaskCompletion for task6 due to error', e);
        }
      } catch (e) {
        console.error('Error calling updateModuleTask RPC on back:', e);
        // Do not call updateTaskCompletion for task6; rely on module triggers to recompute profiles.
        console.debug('confirmBack: failed to call updateModuleTask; not updating profiles directly for task6');
      }
    } catch (err) {
      console.error('Error computing/persisting new task score on back:', err);
    }

    // Go back to the videos list view
    setView("videos");
  };

  // const confirmBack = () => {
  //   setShowBackWarning(false);
  //   // Mark as completed with current score for this video, and update total
  //   const currentModule = ADVANCED_MODULES[currentModuleIndex];
  //   const currentVideo = currentModule.videos[currentVideoIndex];
  //   const videoId = currentVideo.id;
  //   const maxQuizScore =
  //     currentQuizQuestions.length >=0 ? currentQuizQuestions.length : 7;
  //   // Update per-video quiz score
  //   setQuizScores((prev) => {
  //     const updated = { ...prev, [videoId]: currentQuizScore };
  //     // Calculate per-module completion and score
  //     let totalScore = 0;
  //     let completedSteps = 0;
  //     ADVANCED_MODULES.forEach((module) => {
  //       const moduleVideoIds = module.videos.map((v) => v.id);
  //       const moduleCompleted = moduleVideoIds.every(
  //         (id) => videoProgress[id]?.isComplete
  //       );
  //       if (moduleCompleted) {
  //         // Sum scores for this module
  //         const moduleScore = moduleVideoIds.reduce(
  //           (sum, id) => sum + (updated[id]||0 ),0
  //         );
  //         totalScore += moduleScore;
  //         completedSteps += module.videos.length;
  //       }
  //     });
  //     updateTaskCompletion("task6", completedSteps, totalScore);
  //     return updated;
  //   });
  //   setView("videos");
  // };

  const cancelBack = () => {
    setShowBackWarning(false);
  };

  const currentModule = ADVANCED_MODULES[currentModuleIndex];
  const currentVideo = currentModule?.videos[currentVideoIndex];
  const currentVideoId = currentVideo?.id;
  const isVideoWatched =
    currentVideoId &&
    (videoProgress[currentVideoId]?.isComplete ||
      ((videoProgress[currentVideoId]?.watchedSeconds || 0) >=
        videoDuration * 0.95 &&
        videoDuration > 0));

  // Derived boolean indicating whether the currently selected module is M2
  const isM2Module = ADVANCED_MODULES[currentModuleIndex]?.id === 'M2';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 pt-16 animate-fade-in">
      <button
        data-kn-skip
        onClick={handleBack}
        className="absolute top-20 left-4 sm:left-6 lg:left-8 flex items-center gap-2 text-black hover:text-red-500 transition-colors"
      >
        <ChevronLeftIcon className="w-6 h-6" />
        {t("back")}
      </button>

      {showBackWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md mx-4">
            <h3 className="text-xl font-bold text-red-600 mb-4">{t('warning_title')}</h3>
            <p className="text-gray-700 mb-4">
              {t('warning_text_prefix')} <strong>{currentQuizScore} {t('score')}</strong> {t('warning_text_suffix')}
            </p>
            <div className="flex gap-4 justify-end">
              <button onClick={cancelBack} className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors">
                {t('cancel')}
              </button>
              <button onClick={confirmBack} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                {t('Yes Go Back')}
              </button>
            </div>
          </div>
        </div>
      )}

      <div
        className={`w-full max-w-2xl text-center ${
          view === "instructions" ? "" : "hidden"
        }`}
      >
        <h1 className="text-4xl font-bold mb-4">
          {t("Video awareness and evaluation module")}
        </h1>
        <div className="bg-white p-8 rounded-2xl shadow-xl text-center">
          <h2 className="text-2xl font-semibold text-black mb-4">
            {t("Instructions") || "Instructions"}
          </h2>
          <ul className="list-disc list-outside space-y-2 text-black text-left">
            <li>{t('advanced_instructions_bullet_1') || 'This module is consists of different topics with multiple videos in each topics'}</li>
            <li>{t('advanced_instructions_bullet_2') || 'After completion of each video “Quiz start” button will be appeared automatically.'}</li>
            <li>{t('advanced_instructions_bullet_3') || 'Read each question carefully and select the correct answer from the given choices.'}</li>
            <li>{t('advanced_instructions_bullet_4') || 'Each correct answer will earn 1 point.'}</li>
            <li>{t('advanced_instructions_bullet_5') || 'The top scorer will be recognized and selected for the next round of evaluation.(Considering all types of quizzes)'}</li>
          </ul>
        </div>
        <button
          onClick={() => setView("modules")}
          className="mt-8 px-8 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors"
        >
          {t('Start Learning')}
        </button>
      </div>

      <div
        className={`w-full max-w-2xl text-center ${
          view === "modules" ? "" : "hidden"
        }`}
      >
        <h1 className="text-3xl font-bold mb-6">
          {t("Video awareness and evaluation module")}
        </h1>
        <div className="space-y-4">
          {ADVANCED_MODULES.map((module, index) => {
            const moduleVideos = module.videos;
            const completedVideos = moduleVideos.filter(
              (video) => videoProgress[video.id]?.isComplete
            ).length;
            const isModuleComplete = completedVideos === moduleVideos.length;
            return (
              <button
                key={module.id}
                onClick={() => selectModule(index)}
                disabled={isModuleComplete}
                className="w-full p-4 bg-white border border-gray-200 rounded-lg shadow-md flex justify-between items-center text-left disabled:opacity-50 disabled:cursor-not-allowed hover:bg-red-100/50 transition-colors"
              >
                <div className="flex items-center">
                  <span
                    className={`mr-4 font-bold ${
                      isModuleComplete ? "text-green-500" : "text-red-500"
                    }`}
                  >
                    {isModuleComplete ? (
                      <CheckCircleIcon className="w-6 h-6" />
                    ) : (
                      module.id
                    )}
                  </span>
                  <span>
                    {language === "kn"
                      ? module.titleKn || module.title
                      : module.title}
                  </span>
                </div>
                {/* {module.id === "M3" ? (
                  <span className="font-bold text-blue-500">
                    {t("Coming Soon")}
                  </span>
                ) :  */
                isModuleComplete ? (
                  <span className="font-bold text-green-500">{t("done")}</span>
                ) : (
                  <span className="text-sm text-gray-500">
                    {completedVideos}/{moduleVideos.length} {t("videos")}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div
        className={`w-full max-w-2xl text-center ${
          view === "videos" ? "" : "hidden"
        }`}
      >
        <h1 className="text-3xl font-bold mb-6">
          {language === "kn"
            ? currentModule?.titleKn || currentModule?.title
            : currentModule?.title}
        </h1>
        <div className="space-y-4">
          {currentModule?.videos.map((video, index) => {
            const progress = videoProgress[video.id];
            const isComplete = progress?.isComplete;
            return (
              <button
                key={video.id}
                onClick={() => selectVideo(index)}
                disabled={isComplete}
                className="w-full p-4 bg-white border border-gray-200 rounded-lg shadow-md flex justify-between items-center text-left disabled:opacity-50 disabled:cursor-not-allowed hover:bg-red-100/50 transition-colors"
              >
                <div className="flex items-center">
                  <span
                    className={`mr-4 font-bold ${
                      isComplete ? "text-green-500" : "text-red-500"
                    }`}
                  >
                    {isComplete ? (
                      <CheckCircleIcon className="w-6 h-6" />
                    ) : (
                      `V${index + 1}`
                    )}
                  </span>
                  <span>
                    {language === "kn"
                      ? video.titleKn || video.title
                      : video.title}
                  </span>
                </div>
                {isComplete ? (
                  <span className="font-bold text-green-500">{t("done")}</span>
                ) : (
                  <PlayIcon className="w-6 h-6" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className={`w-full max-w-4xl ${view === "player" ? "" : "hidden"}`}>
        <h2 className="text-2xl font-bold mb-4 text-center">
          {language === "kn"
            ? currentVideo?.titleKn || currentVideo?.title
            : currentVideo?.title}
        </h2>
        <div className="aspect-video bg-black rounded-lg shadow-lg overflow-hidden">
          <div ref={playerContainerRef} className="w-full h-full"></div>
        </div>
        <div className="mt-4 text-center">
          {isVideoWatched ? (
            <button
              onClick={() => {
                if (currentQuizQuestions.length === 0) {
                  // M2 Task 1: Use static quiz arrays for this module
                  if (currentModule?.id === 'M2' && currentVideoIndex === 0) {
                    const quizArr = language === 'kn' ? M2_TASK1_QUIZ_KN : M2_TASK1_QUIZ;
                    setCurrentQuizQuestions(attachKannadaFields(getRandomQuestions(quizArr, quizArr.length)));
                  } else if (currentModule?.id === 'M2' && currentVideoIndex === 2) {
                    // M2 Task 3: Use static quiz arrays for this module
                    const quizArr = language === 'kn' ? M2_TASK3_QUIZ_KN : M2_TASK3_QUIZ;
                    setCurrentQuizQuestions(attachKannadaFields(getRandomQuestions(quizArr, quizArr.length)));
                  } else {
                    const quizQuestions = getRandomQuestions(
                      currentModule?.quizzes[currentVideoIndex] || [],
                      7
                    );
                    setCurrentQuizQuestions(attachKannadaFields(quizQuestions));
                  }
                }
                setStartedQuiz(true);
                setView("quiz");
              }}
              className="px-6 py-2 bg-green-500 text-white font-bold rounded-lg hover:bg-green-600"
            >
              {t("Proceed to Quiz")}
            </button>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t("Watch to Unlock")}
            </p>
          )}
        </div>
      </div>

      {view === "quiz" && (
        <Quiz
          questions={currentQuizQuestions}
          onComplete={handleQuizComplete}
          onScoreUpdate={setCurrentQuizScore}
          quizId={`${currentModule?.id || 'M'}-${currentVideoIndex}`}
            onShowResult={(s) => { setResultScore(s); setTimeout(() => setShowResultModal(true), 120); }}
        />
      )}

      {/* {showBackWarning && (
        // <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
        //   <div
        //     className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 text-center transform transition-all scale-95 opacity-0 animate-fade-in"
        //     style={{
        //       animationDelay: "100ms",
        //       animationFillMode: "forwards",
        //       animationName: "zoomIn",
        //     }}
        //   >
        //     <style>{`@keyframes zoomIn { to { transform: scale(1); opacity: 1; } }`}</style>
        //     <button
        //       onClick={cancelBack}
        //       className="absolute top-3 right-3 text-black hover:text-red-500"
        //     >
        //       <XCircleIcon className="w-8 h-8" />
        //     </button>
        //     <h2 className="text-2xl font-extrabold text-black mb-4">
        //       {t("warning_title")}
        //     </h2>
        //     <p className="text-black mb-6">
        //       {t("warning_text_prefix")}{" "}
        //       <strong>
        //         {currentQuizScore} {t("points_label")}
        //       </strong>{" "}
        //       {t("warning_text_suffix")}
        //     </p>
        //     <div className="flex gap-4">
        //       <button
        //         onClick={cancelBack}
        //         className="flex-1 py-2 bg-white text-black font-bold rounded-lg hover:bg-gray-300 transition-colors"
        //       >
        //         {t("cancel")}
        //       </button>
        //       <button
        //         onClick={confirmBack}
        //         className="flex-1 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors"
        //       >
        //         {t("Yes Go Back")}
        //       </button>
        //     </div>
        //   </div>
        // </div> PREVIOUS CODE

        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md mx-4">
            <h3 className="text-xl font-bold text-red-600 mb-4">{t('warning_title')}</h3>
            <p className="text-gray-700 mb-4">
              {t('warning_text_prefix')} <strong>{currentQuizScore} {t('score')}</strong> {t('warning_text_suffix')}
            </p>
            <div className="flex gap-4 justify-end">
              <button onClick={cancelBack} className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors">
                {t('cancel')}
              </button>
              <button onClick={confirmBack} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                {t('Yes Go Back')}
              </button>
            </div>
          </div>
        </div>
      )} */}

      <div className={`text-center ${view === "completed" ? "" : "hidden"}`}>
        <CheckCircleIcon className="w-24 h-24 text-green-500 mx--auto mb-4" />
        <h2 className="text-3xl font-bold">{t("Task completed")}</h2>
        <p className="mt-2 text-lg text-black">
          {t("Video Task Completed Message")}
        </p>
        <button
          onClick={() => setCurrentPage(Page.DASHBOARD)}
          className="mt-6 px-8 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700"
        >
          {t("Return to Dashboard")}
        </button>
      </div>
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
                <div className="text-4xl font-bold text-blue-600 tracking-tight">{resultScore}/{QUESTIONS_PER_VIDEO}</div>
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

export default VideoTask;
