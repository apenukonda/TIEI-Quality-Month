// @vitest-environment jsdom
import React, { StrictMode } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppContext } from '../context/AppContext';
import Quiz from '../components/Quiz';

vi.mock('../context/supabaseClient', () => ({ default: {} }));
const question = { text: 'What is quality?', options: ['Correct', 'Wrong'], correctAnswer: 'Correct' };
const context = { language: 'en', t: (key: string) => ({
  finish_quiz: 'Finish quiz', next_question: 'Next question', saving_score: 'Saving score...', retry_save: 'Retry save',
}[key] || key) } as any;
afterEach(() => { cleanup(); vi.useRealTimers(); });

function quiz(props: any) {
  return render(<StrictMode><AppContext.Provider value={context}>
    <Quiz questions={[question]} {...props} />
  </AppContext.Provider></StrictMode>);
}

describe('quiz score submission', () => {
  it('awards one point and reports it once under StrictMode', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const update = vi.fn();
    const showResult = vi.fn();
    quiz({ onComplete: save, onScoreUpdate: update, onShowResult: showResult });
    fireEvent.click(screen.getByRole('button', { name: 'A Correct' }));
    expect(update).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith(1);
    fireEvent.click(screen.getByRole('button', { name: 'Finish quiz' }));
    await waitFor(() => expect(showResult).toHaveBeenCalledWith(1));
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith(1);
  });

  it('waits for persistence and blocks duplicate submissions', async () => {
    let finish!: () => void;
    const save = vi.fn(() => new Promise<void>(resolve => { finish = resolve; }));
    const showResult = vi.fn();
    quiz({ onComplete: save, onShowResult: showResult });
    fireEvent.click(screen.getByRole('button', { name: 'A Correct' }));
    const button = screen.getByRole('button', { name: 'Finish quiz' });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(save).toHaveBeenCalledTimes(1);
    expect(showResult).not.toHaveBeenCalled();
    expect((screen.getByRole('button', { name: 'Saving score...' }) as HTMLButtonElement).disabled).toBe(true);
    await act(async () => finish());
    expect(showResult).toHaveBeenCalledTimes(1);
  });

  it('retains the earned score and lets the user retry a failed save', async () => {
    const save = vi.fn().mockRejectedValueOnce(new Error('Connection interrupted')).mockResolvedValueOnce(undefined);
    const showResult = vi.fn();
    quiz({ onComplete: save, onShowResult: showResult });
    fireEvent.click(screen.getByRole('button', { name: 'A Correct' }));
    fireEvent.click(screen.getByRole('button', { name: 'Finish quiz' }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('Connection interrupted'));
    expect(showResult).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Retry save' }));
    await waitFor(() => expect(showResult).toHaveBeenCalledWith(1));
    expect(save.mock.calls).toEqual([[1], [1]]);
  });

  it('records a timed-out question as zero and does not advance while saving', async () => {
    vi.useFakeTimers();
    const save = vi.fn().mockResolvedValue(undefined);
    quiz({ onComplete: save });
    act(() => vi.advanceTimersByTime(20000));
    expect(screen.getByText('time_up_incorrect')).toBeTruthy();
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Finish quiz' })));
    expect(save).toHaveBeenCalledWith(0);
  });
});
