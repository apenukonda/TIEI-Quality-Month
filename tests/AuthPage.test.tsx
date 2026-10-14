// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppContext } from '../context/AppContext';
import AuthPage from '../components/AuthPage';
import { Page } from '../types';

vi.mock('../context/supabaseClient', () => ({ default: {} }));
afterEach(cleanup);
function mount(getDepartments = vi.fn().mockResolvedValue(['INFORMATION SYSTEMS', 'TNGA - HEAD'])) {
  const signup = vi.fn().mockResolvedValue({ success: false, error: 'Please contact the admin' });
  const value = { currentPage: Page.SIGNUP, currentUser: null, setCurrentPage: vi.fn(), signup, getRegistrationDepartments: getDepartments } as any;
  render(<AppContext.Provider value={value}><AuthPage /></AppContext.Provider>);
  return { signup, getDepartments };
}

describe('employee signup form', () => {
  it('omits name/designation and submits employee number with a database department', async () => {
    const { signup } = mount();
    await screen.findByRole('option', { name: 'TNGA - HEAD' });
    expect(screen.queryByText('Name')).toBeNull();
    expect(screen.queryByText('Designation')).toBeNull();
    fireEvent.change(screen.getByRole('textbox', { name: 'Employee ID' }), { target: { value: '00001' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Department' }), { target: { value: 'TNGA - HEAD' } });
    fireEvent.change(screen.getByLabelText('Passcode', { exact: true }), { target: { value: '1234' } });
    fireEvent.change(screen.getByLabelText('Confirm Passcode'), { target: { value: '1234' } });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));
    await waitFor(() => expect(signup).toHaveBeenCalledWith({ userId: '00001', department: 'TNGA - HEAD', passcode: '1234' }));
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Please contact the admin');
  });
  it('disables signup on department load failure and allows retry', async () => {
    const getDepartments = vi.fn().mockRejectedValueOnce(new Error('Departments could not be loaded. Please try again.'))
      .mockResolvedValueOnce(['INFORMATION SYSTEMS']);
    mount(getDepartments);
    await screen.findByRole('alert');
    expect((screen.getByRole('button', { name: 'Create Account' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await screen.findByRole('option', { name: 'INFORMATION SYSTEMS' });
    await waitFor(() => expect((screen.getByRole('button', { name: 'Create Account' }) as HTMLButtonElement).disabled).toBe(false));
  });
});
