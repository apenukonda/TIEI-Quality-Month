# TODO: Restructure Advanced Quality Principles Task

## Overview

- Change the Advanced Quality Principles task to have separate module cards (M1, M2, M3).
- Each module has videos, each video has a quiz with 7 questions.
- M1: 6 videos (42 points), M2: 4 videos (28 points), M3: Coming soon (0 points).
- Total questions: 70, progress bar shows answered questions / 70.
- Keep video completion requirement for quizzes.

## Steps

- [x] Update constants.ts: Define ADVANCED_MODULES with videos and dummy quizzes (7 questions each).
- [x] Update VideoTask.tsx: Change list view to show module cards, add videos view for each module.
- [x] Update progress calculation: completedSteps = number of completed videos \* 7, totalSteps = 70, maxScore = 70.
- [x] Update instructions in VideoTask to reflect new structure.
- [x] Test the changes: Ensure quizzes unlock after video completion, points update per question, progress bar accurate.
