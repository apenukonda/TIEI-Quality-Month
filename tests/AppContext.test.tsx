// @vitest-environment jsdom
import React, { useContext } from 'react';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppContext, AppProvider } from '../context/AppContext';

const backend = vi.hoisted(() => ({
  score: 11,
  getSession: vi.fn(),
  signOut: vi.fn(),
  signUp: vi.fn(),
  rpc: vi.fn(),
  from: vi.fn(),
}));
vi.mock('../context/supabaseClient', () => ({ default: {
  auth: { getSession: backend.getSession, signOut: backend.signOut, signUp: backend.signUp },
  rpc: backend.rpc,
  from: backend.from,
} }));

let context: React.ContextType<typeof AppContext>;
function Probe() {
  context = useContext(AppContext);
  return <span>{context.currentUser?.score}</span>;
}
beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  backend.score = 11;
  backend.getSession.mockResolvedValue({ data: { session: { user: { id: 'user' } } }, error: null });
  backend.signOut.mockResolvedValue({ error: null });
  backend.rpc.mockResolvedValue({ data: 11, error: null });
  backend.from.mockImplementation(table => {
    const result = () => ({ data: table === 'profiles' ? { score: backend.score } : [
      { task_id: 'task1', completed_steps: 7, score: 5 },
      { task_id: 'task6', completed_steps: 7, score: 6 },
    ], error: null });
    const builder = {
      select: () => builder,
      eq: () => builder,
      single: async () => result(),
      maybeSingle: async () => result(),
      then: (resolve: any, reject: any) => Promise.resolve(result()).then(resolve, reject),
    };
    return builder;
  });
  localStorage.setItem('toyota_quality_session', JSON.stringify({
    user: { id: 'user', userId: 'employee', name: 'Test', score: 1 }, expiry: Date.now() + 100000,
  }));
});
afterEach(cleanup);

async function mount() {
  render(<AppProvider><Probe /></AppProvider>);
  await waitFor(() => expect(context.currentUser?.score).toBe(11));
  await waitFor(() => expect(context.tasks.find(task => task.id === 'task6')?.completedSteps).toBe(7));
}

describe('score state and restored progress', () => {
  it('loads the server total and stored module progress instead of a stale cached score', async () => {
    await mount();
    expect(JSON.parse(localStorage.getItem('toyota_quality_session')!).user.score).toBe(11);
  });

  it('serializes overlapping saves so a slow earlier response cannot overwrite the newer total', async () => {
    await mount();
    let finish!: (result: any) => void;
    backend.rpc.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }))
      .mockResolvedValueOnce({ data: 14, error: null });
    let first!: Promise<void>;
    let second!: Promise<void>;
    act(() => {
      first = context.updateTaskCompletion('task1', 7, 5);
      second = context.updateTaskCompletion('task4', 1, 3);
    });
    await waitFor(() => expect(backend.rpc).toHaveBeenCalledTimes(1));
    await act(async () => {
      finish({ data: 11, error: null });
      await Promise.all([first, second]);
    });
    expect(context.currentUser?.score).toBe(14);
    expect(JSON.parse(localStorage.getItem('toyota_quality_session')!).user.score).toBe(14);
  });

  it('does not restore a logged-out user when an earlier score save completes', async () => {
    await mount();
    let finish!: (result: any) => void;
    backend.rpc.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    let pending!: Promise<void>;
    act(() => { pending = context.updateTaskCompletion('task4', 1, 3); });
    await waitFor(() => expect(backend.rpc).toHaveBeenCalledTimes(1));
    await act(async () => context.logout());
    await act(async () => { finish({ data: 14, error: null }); await pending; });
    expect(context.currentUser).toBeNull();
    expect(localStorage.getItem('toyota_quality_session')).toBeNull();
  });

  it('requires authentication when restoring a cached user', async () => {
    backend.getSession.mockResolvedValue({ data: { session: null }, error: null });
    render(<AppProvider><Probe /></AppProvider>);
    await waitFor(() => expect(localStorage.getItem('toyota_quality_session')).toBeNull());
    expect(context.currentUser).toBeNull();
  });

  it('blocks a mismatched employee before making any Auth signup request', async () => {
    await mount();
    backend.rpc.mockResolvedValueOnce({ data: false, error: null });
    const result = await context.signup({ userId: '00001', department: 'TNGA - HEAD', passcode: '1234' });
    expect(result).toEqual({ success: false, error: 'Please check your Employee ID and Department or contact admin' });
    expect(backend.signUp).not.toHaveBeenCalled();
  });

  it('does not create an account if the employee verification API is unavailable', async () => {
    await mount();
    backend.rpc.mockResolvedValueOnce({ data: null, error: { message: 'Offline' } });
    const result = await context.signup({ userId: '00001', department: 'TNGA - HEAD', passcode: '1234' });
    expect(result.success).toBe(false);
    expect(result.error).toContain('could not be verified');
    expect(backend.signUp).not.toHaveBeenCalled();
  });

  it('cleans up an orphan Auth account and retries signup when user already exists in Auth but has no profile', async () => {
    await mount();
    // 1. Roster verification succeeds
    backend.rpc.mockResolvedValueOnce({ data: true, error: null });
    // 2. First signUp fails with already registered
    backend.signUp.mockResolvedValueOnce({ data: {}, error: { message: 'User already registered' } });
    // 3. cleanup_orphan_user RPC succeeds
    backend.rpc.mockResolvedValueOnce({ data: true, error: null });
    // 4. Retry signUp succeeds
    backend.signUp.mockResolvedValueOnce({ data: { user: { id: 'new-user' } }, error: null });

    const result = await context.signup({ userId: '00468', department: 'SCM projects', passcode: '1234' });
    expect(backend.rpc).toHaveBeenCalledWith('cleanup_orphan_user', {
      p_employee_number: '00468',
      p_department: 'SCM projects',
    });
    expect(backend.signUp).toHaveBeenCalledTimes(2);
    expect(result.success).toBe(true);
  });
});

