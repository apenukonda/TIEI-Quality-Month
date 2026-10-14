// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppContext } from '../context/AppContext';
import VideoTask from '../components/VideoTask';

vi.mock('../context/supabaseClient', () => ({ default: {} }));
vi.mock('../constants', () => ({
  INITIAL_TASKS: [],
  ADVANCED_MODULES: [{ id: 'M1', title: 'Module one', videos: [{ id: 'video', title: 'Video one' }], quizzes: [[]] }],
}));
vi.mock('../components/Quiz', () => ({ default: ({ onComplete }: any) =>
  <button onClick={() => onComplete(5)}>Submit test quiz</button> }));
afterEach(cleanup);

function mount(completed: boolean) {
  const value = {
    currentUser: { id: 'user' }, language: 'en', t: (key: string) => key,
    selectedModuleIndex: 0, setSelectedModuleIndex: vi.fn(), setCurrentPage: vi.fn(),
    getVideoProgress: vi.fn().mockResolvedValue({ video: { watchedSeconds: 100, isComplete: true } }),
    getModuleQuizProgress: vi.fn().mockResolvedValue({ 'm1:1': completed }),
    updateModuleTask: vi.fn().mockResolvedValue(5), updateVideoProgress: vi.fn().mockResolvedValue(undefined),
  } as any;
  render(<AppContext.Provider value={value}><VideoTask /></AppContext.Provider>);
  return value;
}

describe('video watch and quiz completion', () => {
  it('keeps a watched video available until its quiz has actually been submitted', async () => {
    const value = mount(false);
    const video = await screen.findByRole('button', { name: /Video one/ });
    await waitFor(() => expect((video as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(video);
    fireEvent.click(screen.getByRole('button', { name: 'Proceed to Quiz' }));
    fireEvent.click(screen.getByRole('button', { name: 'Submit test quiz' }));
    await waitFor(() => expect(value.updateModuleTask).toHaveBeenCalledWith('m1', 1, true, 5));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Submit test quiz' })).toBeNull());
    expect(value.updateVideoProgress).toHaveBeenCalledWith('video', 100, true);
  });

  it('restores submitted quizzes as completed after a refresh', async () => {
    mount(true);
    const video = await screen.findByRole('button', { name: /Video one done/ });
    expect((video as HTMLButtonElement).disabled).toBe(true);
  });
});
