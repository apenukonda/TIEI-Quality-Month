// Keep score writes on the server so retries and concurrent quizzes cannot
// overwrite the total using an incomplete browser snapshot.
export function createScoreService(client: any) {
  const save = async (userId: string, name: string, args: Record<string, unknown>): Promise<number> => {
    const { data: auth, error: authError } = await client.auth.getSession();
    if (authError || auth.session?.user.id !== userId) {
      throw new Error('Please log in again before saving your score.');
    }

    const { data, error } = await client.rpc(name, args);
    if (error) {
      console.error('Score save failed:', error);
      throw new Error(error.code === 'PGRST202'
        ? 'Score saving needs a backend update. Please contact the event administrator.'
        : 'Your score could not be saved. Please check your connection and try again.');
    }

    // Both score RPCs return the authoritative profile total, including zero.
    if (typeof data === 'number' && Number.isFinite(data) && data >= 0) return data;

    const { data: profile, error: profileError } = await client
      .from('profiles').select('score').eq('id', userId).single();
    if (profileError || typeof profile?.score !== 'number') {
      throw new Error('Your result was submitted, but the total could not be refreshed. Please try again.');
    }
    return profile.score;
  };

  return {
    getModuleProgress: async (userId: string): Promise<Record<string, boolean>> => {
      const results = await Promise.all(['m1', 'm2', 'm3'].map(async module => {
        const { data, error } = await client.from(`module_${module}_progress`)
          .select('*').eq('user_id', userId).maybeSingle();
        if (error) throw new Error('Saved quiz progress could not be loaded. Please try again.');
        return { module, data };
      }));
      const completed: Record<string, boolean> = {};
      for (const { module, data } of results) {
        const count = module === 'm1' ? 6 : module === 'm2' ? 4 : 5;
        for (let index = 1; index <= count; index++) {
          completed[`${module}:${index}`] = data?.[`task${index}_completed`] === true;
        }
      }
      return completed;
    },
    updateTask: (userId: string, taskId: string, completedSteps: number, score: number) =>
      save(userId, 'handle_task_completion', {
        user_id_in: userId, task_id_in: taskId,
        completed_steps_in: completedSteps, score_earned_in: score,
      }),
    updateModule: (userId: string, moduleName: string, taskIndex: number, completed: boolean, score: number) =>
      save(userId, 'update_module_task', {
        user_id_in: userId, module_name: moduleName,
        task_index: taskIndex, completed, score,
      }),
  };
}
