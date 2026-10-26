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
  const signup = vi.fn().mockResolvedValue({ success: false, error: 'Please check that your employee ID and department match. If you need further assistance, click the Need help link below.' });
  const value = { currentPage: Page.SIGNUP, currentUser: null, setCurrentPage: vi.fn(), signup, getRegistrationDepartments: getDepartments } as any;
  render(<AppContext.Provider value={value}><AuthPage /></AppContext.Provider>);
  return { signup, getDepartments };
}

describe('employee signup form', () => {
  it('shows the point-of-contact phone number in the help link', () => {
    mount();
    const helpLink = screen.getByRole('link', { name: 'Need help? Click here to contact us at +91 94494 52519.' });
    expect(helpLink.getAttribute('href')).toBe('https://wa.me/919449452519');
  });

  it('omits name/designation and submits employee number with a database department', async () => {
    const { signup } = mount();
    await screen.findByRole('option', { name: 'TNGA - HEAD' });
    expect(screen.queryByText('Name')).toBeNull();
    expect(screen.queryByText('Designation')).toBeNull();

    // Verify placeholders
    expect(screen.getByPlaceholderText('Please enter your employee ID')).toBeDefined();
    expect(screen.getByPlaceholderText('Enter 4-digit passcode')).toBeDefined();
    expect(screen.getByPlaceholderText('Re-enter your passcode')).toBeDefined();

    fireEvent.change(screen.getByRole('textbox', { name: 'Employee ID' }), { target: { value: '00001' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Department' }), { target: { value: 'TNGA - HEAD' } });
    fireEvent.change(screen.getByLabelText('Passcode', { exact: true }), { target: { value: '1234' } });
    fireEvent.change(screen.getByLabelText('Confirm Passcode'), { target: { value: '1234' } });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));
    await waitFor(() => expect(signup).toHaveBeenCalledWith({ userId: '00001', department: 'TNGA - HEAD', passcode: '1234' }));
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Please check that your employee ID and department match. If you need further assistance, click the Need help link below.');
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

  it('requires an employee ID on signup', async () => {
    const { signup } = mount();
    await screen.findByRole('option', { name: 'TNGA - HEAD' });
    fireEvent.change(screen.getByRole('textbox', { name: 'Employee ID' }), { target: { value: '' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Department' }), { target: { value: 'TNGA - HEAD' } });
    fireEvent.change(screen.getByLabelText('Passcode', { exact: true }), { target: { value: '1234' } });
    fireEvent.change(screen.getByLabelText('Confirm Passcode'), { target: { value: '1234' } });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.submit(screen.getByRole('button', { name: 'Create Account' }).closest('form')!);
    expect(await screen.findByText('Employee ID must be 1 to 6 digits.')).toBeDefined();
    expect(signup).not.toHaveBeenCalled();
  });

  it('allows a 6-digit employee ID to reach registration verification', async () => {
    const { signup } = mount();
    await screen.findByRole('option', { name: 'TNGA - HEAD' });
    fireEvent.change(screen.getByRole('textbox', { name: 'Employee ID' }), { target: { value: '123456' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Department' }), { target: { value: 'TNGA - HEAD' } });
    fireEvent.change(screen.getByLabelText('Passcode', { exact: true }), { target: { value: '1234' } });
    fireEvent.change(screen.getByLabelText('Confirm Passcode'), { target: { value: '1234' } });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));
    await waitFor(() => expect(signup).toHaveBeenCalledWith({ userId: '123456', department: 'TNGA - HEAD', passcode: '1234' }));
  });

  it('requires agreement checkbox before registration', async () => {
    const { signup } = mount();
    await screen.findByRole('option', { name: 'TNGA - HEAD' });
    fireEvent.change(screen.getByRole('textbox', { name: 'Employee ID' }), { target: { value: '12345' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Department' }), { target: { value: 'TNGA - HEAD' } });
    fireEvent.change(screen.getByLabelText('Passcode', { exact: true }), { target: { value: '1234' } });
    fireEvent.change(screen.getByLabelText('Confirm Passcode'), { target: { value: '1234' } });
    // Note: checkbox not clicked
    fireEvent.submit(screen.getByRole('button', { name: 'Create Account' }).closest('form')!);
    expect(await screen.findByText('Please confirm that the details provided are voluntarily by you.')).toBeDefined();
    expect(signup).not.toHaveBeenCalled();
  });
});

describe('employee login form', () => {
  it('accepts a 6-digit ID when logging in', async () => {
    const login = vi.fn().mockResolvedValue({ success: false, error: 'Invalid credentials' });
    const value = { currentPage: Page.LOGIN, currentUser: null, setCurrentPage: vi.fn(), login, getRegistrationDepartments: vi.fn() } as any;
    render(<AppContext.Provider value={value}><AuthPage /></AppContext.Provider>);

    expect(screen.getByPlaceholderText('Enter employee ID')).toBeDefined();
    expect(screen.getByPlaceholderText('Enter 4-digit passcode')).toBeDefined();

    fireEvent.change(screen.getByPlaceholderText('Enter employee ID'), { target: { value: '123456' } });
    fireEvent.change(screen.getByPlaceholderText('Enter 4-digit passcode'), { target: { value: '1234' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Login' }).closest('form')!);

    await waitFor(() => expect(login).toHaveBeenCalledWith('123456', '1234', 'user'));
  });
});
