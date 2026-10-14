# Score update

Applied to Supabase project `paysoqcytmymbkglhasy` as migration
`20261013180740_fix_atomic_game_scores`.

Live validation passed for score writes and reads under the authenticated role,
combined activity totals, repeated submissions, zero-point quizzes, saved
completion progress, invalid scores, and rejected submissions for another user.
All temporary validation records were rolled back. Existing accounts, progress,
and earned points were preserved.

Refresh the local app at http://127.0.0.1:3000 and log in to use the updated flow.

## Applying to another existing installation

The browser changes need the updated database functions in the existing
Supabase project.

1. Open the project's Supabase dashboard and its **SQL Editor**.
2. Paste the full contents of `score_updates.sql` into a new query and run it.
3. Refresh the local app at http://127.0.0.1:3000 and log in.

The migration updates the score functions, recalculates totals from saved
results, and creates missing `task6` progress aggregates. It preserves accounts,
submissions, and earned scores. Do not rerun the older README's table-reset
script to apply this fix.

Each quiz retains its best submitted result. Retrying the same save does not
award points twice. The total counts the MD quiz, all module quizzes, and other
activities once each. Watching a video unlocks its quiz; completing the quiz
saves points and completion separately.

For example, a user with 5 MD quiz points who earns 6 points in one module quiz
has 11 total points and 7 completed module questions. After earning 4 points
in another module quiz, the total becomes 15 and the module progress becomes
14 questions. Refreshing the app reloads those values from the database.

Validation commands:

```sh
npm test
npx tsc --noEmit
npm run build
```

Automated tests use an isolated in-memory PostgreSQL database and mocked
authentication. They do not create users or modify the hosted project's data.

`tests/verify_scores_live.sql` verifies the deployed functions using temporary
records inside a rolled-back savepoint. It also switches to the authenticated
database role to exercise the application's permissions.

The score RPCs intentionally use `SECURITY DEFINER` to update related tables
atomically. Both require authentication, bind submissions to `auth.uid()`, validate
result bounds, and pin their search paths. Anonymous execution is revoked, and
the internal recalculation helper cannot be called by client roles. Supabase's
[authenticated definer advisory](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable)
flags these two intentional authenticated entry points.
