# Live signup and score test

Tested the local app at `http://127.0.0.1:3000` against the real Supabase backend
on 2026-10-14, using synthetic employee **999901**, named **Codex Dummy QA**.
The employee, account, and associated database test records were deleted at the
user's request after the test. Cleanup verified zero remaining dummy rows and
preserved the 1,637 real employee records and 14 existing profiles.
No real employee's identity or account was used. The test account has the `user` role.

## Results

| Activity | Expected points from this test | Saved points | Completion |
| --- | ---: | ---: | --- |
| MD quiz | 1 | 1 | 7/7 questions |
| M1: six video quizzes | 13 | 13 | 42/42 questions |
| M2: four video quizzes | 28 | 28 | 28/28 questions |
| M3: five video quizzes | 23 | 23 | 35/35 questions |
| Cartoon upload | 5 | 5 | 1/1 |
| Slogan submission | 3 | 3 | 1/1 |
| Kaizen portal completion | 3 | 3 | 1/1 |
| **Total** | **76** | **76** | **All portal tasks completed** |

Quiz scores were checked against the correct/incorrect feedback from the real UI,
then compared with each saved module result. Per-video quiz scores were:

- M1: `1, 2, 1, 0, 2, 7`.
- M2: `7, 7, 7, 7`.
- M3: `5, 3, 4, 7, 4`.

The combined video task saved 64 points and **105/105** completed questions. The
MD quiz included one timed-out answer; the timeout correctly earned zero points.
The zero-point M1 quiz still counted as completed. Full 7-point results also saved
correctly. The profile total equals the sum of saved task scores, with the module
aggregate counted once.

## Flow and persistence checks

- Signed up through the actual form; the backend filled name and designation from
  the synthetic roster row. Logged out and logged in using the new credentials.
- Played all 16 quizzes through browser controls. Used the video's normal seek
  and playback controls to unlock the quizzes, rather than watching every video
  in full. No score or video completion was inserted to bypass those screens.
- Uploaded a 7 KB synthetic image marked **DUMMY TEST ONLY** through Cloudinary;
  its URL was saved in Supabase and awarded exactly 5 points.
- Submitted a slogan explicitly marked **DUMMY TEST ONLY**, awarding 3 points.
- Exercised Kaizen's **Mark as Complete** portal counter. **No dummy suggestion
  was submitted to the external Microsoft Form**; that external submission flow
  was not tested.
- Refreshed after the MD quiz and after all activities. Logged out and back in
  after completion. The score remained 76 and every completion count was restored.
- Checked 38 repeated or lower-score saves through authenticated score RPCs. None
  duplicated points, lowered a score, or changed completion counts.
- Invalid scores, writes for another user, and direct writes to the module
  aggregate were rejected. The aggregate is maintained by individual quiz saves.
- The other 14 profiles retained their previous total of 28 points.

No score or completion-counter defect was found in this live run. No further
production code changes were needed for this test.

The final dashboard screenshot is saved locally in the task's temporary test
output directory as `dashboard-completed.jpg`.

## Repeating backend retry checks

After creating and completing a new synthetic account, set `DUMMY_EMPLOYEE_ID=999901`
and `DUMMY_PASSCODE` to that account's passcode,
then run `node scripts/test_dummy_score_retries.mjs`. The script refuses accounts
whose profile is not **Codex Dummy QA**, checks the saved score sums, and retries
only previously submitted results. It does not print or save authentication tokens.
