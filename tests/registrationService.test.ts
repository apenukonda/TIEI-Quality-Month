import { describe, expect, it, vi } from 'vitest';
import { createRegistrationService } from '../context/registrationService';

describe('registration API', () => {
  it('keeps leading zeros and sends both fields to one match endpoint', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: false, error: null });
    expect(await createRegistrationService({ rpc }).matches(' 00001 ', ' INFORMATION SYSTEMS ')).toBe(false);
    expect(rpc).toHaveBeenCalledWith('employee_registration_matches', { p_employee_number: '00001', p_department: 'INFORMATION SYSTEMS' });
  });
  it('does not approve signup when verification fails or returns invalid data', async () => {
    for (const response of [{ data: null, error: { message: 'Offline' } }, { data: null, error: null }]) {
      await expect(createRegistrationService({ rpc: vi.fn().mockResolvedValue(response) }).matches('00001','INFORMATION SYSTEMS'))
        .rejects.toThrow('Employee details could not be verified');
    }
  });
  it('loads department names from the database and rejects an empty roster', async () => {
    const rpc = vi.fn().mockResolvedValueOnce({ data: ['TNGA - HEAD'], error: null }).mockResolvedValueOnce({ data: [], error: null });
    const service = createRegistrationService({ rpc });
    expect(await service.getDepartments()).toEqual(['TNGA - HEAD']);
    await expect(service.getDepartments()).rejects.toThrow('Departments could not be loaded');
  });
});
