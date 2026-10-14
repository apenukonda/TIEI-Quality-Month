import { Department } from '../types';

export interface SignupDetails {
  userId: string;
  department: string;
  passcode: string;
}

export const EMPLOYEE_MISMATCH_MESSAGE = 'Please check your Employee ID and Department or contact admin';

export function createRegistrationService(client: any) {
  return {
    async getDepartments(): Promise<string[]> {
      const { data, error } = await client.rpc('get_registration_departments');
      if (error || !Array.isArray(data) || data.some(value => typeof value !== 'string')) {
        throw new Error('Departments could not be loaded. Please try again.');
      }
      const allowedDepartments = new Set<string>(Object.values(Department));
      const departments = [...new Set(data.filter((value: string) => allowedDepartments.has(value)))];
      if (departments.length === 0) {
        throw new Error('Departments could not be loaded. Please try again.');
      }
      return departments;
    },
    async matches(userId: string, department: string): Promise<boolean> {
      const { data, error } = await client.rpc('employee_registration_matches', {
        p_employee_number: userId.trim(),
        p_department: department.trim(),
      });
      if (error || typeof data !== 'boolean') {
        throw new Error('Employee details could not be verified. Please try again.');
      }
      return data;
    },
  };
}
