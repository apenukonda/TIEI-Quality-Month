import { describe, expect, it, vi } from 'vitest';
import { createScoreService } from '../context/scoreService';

function mockClient() {
  return {
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: 'user' } } }, error: null }) },
    rpc: vi.fn().mockResolvedValue({ data: 11, error: null }),
    from: vi.fn(),
  };
}

describe('score persistence', () => {
  it('uses the server total, including a zero score', async () => {
    const client = mockClient();
    const service = createScoreService(client);
    expect(await service.updateModule('user', 'm1', 1, true, 6)).toBe(11);
    expect(client.rpc).toHaveBeenCalledWith('update_module_task', {
      user_id_in: 'user', module_name: 'm1', task_index: 1, completed: true, score: 6,
    });
    client.rpc.mockResolvedValue({ data: 0, error: null });
    expect(await service.updateTask('user', 'task1', 7, 0)).toBe(0);
    expect(client.from).not.toHaveBeenCalled();
  });

  it('fails visibly on RPC errors and never falls back to non-atomic browser writes', async () => {
    const client = mockClient();
    client.rpc.mockResolvedValue({ data: null, error: { code: '42501', message: 'Not permitted' } });
    await expect(createScoreService(client).updateTask('user', 'task1', 7, 5)).rejects.toThrow('could not be saved');
    expect(client.from).not.toHaveBeenCalled();
  });

  it('requires a matching authenticated session', async () => {
    const client = mockClient();
    client.auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
    await expect(createScoreService(client).updateTask('user', 'task1', 7, 5)).rejects.toThrow('log in again');
    expect(client.rpc).not.toHaveBeenCalled();
  });

  it('reloads saved quiz completion independently from watched videos', async () => {
    const client = mockClient();
    client.from.mockImplementation(table => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({
        data: table === 'module_m1_progress' ? { task1_completed: true, task2_completed: false } : null,
        error: null,
      }) }) }),
    }));
    const completed = await createScoreService(client).getModuleProgress('user');
    expect(completed['m1:1']).toBe(true);
    expect(completed['m1:2']).toBe(false);
    expect(completed['m3:5']).toBe(false);
  });
});
