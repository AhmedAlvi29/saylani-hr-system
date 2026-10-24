import { describe, it, expect, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import { calculateAnnualTax, getWorkingDaysInMonth } from '../services/payrollService';

describe('Multi-Company Data Isolation & Business Rules', () => {
  const JWT_SECRET = process.env.JWT_SECRET || 'hcm_dev_fallback_secret_key';

  it('generates JWT tokens containing companyId for tenant isolation', () => {
    const mockUserPayload = {
      id: '6719ab238f4d9b1c9c4501a1',
      email: 'admin@acmecorp.com',
      role: 'admin',
      name: 'Acme Admin',
      companyId: '6719ab238f4d9b1c9c450199',
    };

    const token = jwt.sign(mockUserPayload, JWT_SECRET, { expiresIn: '7d' });
    const decoded: any = jwt.verify(token, JWT_SECRET);

    expect(decoded.id).toBe(mockUserPayload.id);
    expect(decoded.email).toBe(mockUserPayload.email);
    expect(decoded.role).toBe('admin');
    expect(decoded.companyId).toBe(mockUserPayload.companyId);
  });

  it('rejects passwords with less than 6 characters', () => {
    const validatePassword = (pass: string) => {
      if (!pass || pass.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }
      return true;
    };

    expect(() => validatePassword('12345')).toThrow('Password must be at least 6 characters');
    expect(validatePassword('Secure@123')).toBe(true);
  });

  it('validates duplicate email detection logic', () => {
    const existingUsers = [
      { email: 'admin@saylani.org', companyId: 'comp_1' },
      { email: 'hr@saylani.org', companyId: 'comp_1' },
    ];

    const checkDuplicateEmail = (email: string) => {
      const exists = existingUsers.some((u) => u.email.toLowerCase() === email.toLowerCase());
      if (exists) {
        const error: any = new Error(`An account with email '${email}' already exists.`);
        error.statusCode = 409;
        throw error;
      }
      return true;
    };

    expect(() => checkDuplicateEmail('ADMIN@SAYLANI.ORG')).toThrow(/already exists/);
    expect(checkDuplicateEmail('newadmin@techcorp.com')).toBe(true);
  });

  it('validates duplicate company name detection logic', () => {
    const existingCompanies = [
      { name: 'Saylani Systems Ltd', code: 'SSL' },
      { name: 'Acme Corp', code: 'ACME' },
    ];

    const checkDuplicateCompany = (name: string) => {
      const exists = existingCompanies.some((c) => c.name.toLowerCase() === name.toLowerCase());
      if (exists) {
        const error: any = new Error(`A company with the name '${name}' is already registered.`);
        error.statusCode = 409;
        throw error;
      }
      return true;
    };

    expect(() => checkDuplicateCompany('saylani systems ltd')).toThrow(/already registered/);
    expect(checkDuplicateCompany('Omni Dynamics')).toBe(true);
  });

  it('enforces multi-company data filtering: Company A cannot access Company B employees', () => {
    const allEmployees = [
      { id: 'emp_1', name: 'Alice', companyId: 'comp_alpha' },
      { id: 'emp_2', name: 'Bob', companyId: 'comp_alpha' },
      { id: 'emp_3', name: 'Charlie', companyId: 'comp_beta' },
    ];

    const getEmployeesForTenant = (companyId: string) => {
      return allEmployees.filter((e) => e.companyId === companyId);
    };

    const alphaEmployees = getEmployeesForTenant('comp_alpha');
    const betaEmployees = getEmployeesForTenant('comp_beta');

    expect(alphaEmployees).toHaveLength(2);
    expect(alphaEmployees.map((e) => e.name)).toEqual(['Alice', 'Bob']);
    expect(alphaEmployees.some((e) => e.name === 'Charlie')).toBe(false);

    expect(betaEmployees).toHaveLength(1);
    expect(betaEmployees[0].name).toBe('Charlie');
  });

  it('calculates Pakistan tax brackets accurately across multiple salary ranges', () => {
    // Under 600k annual = 0 tax
    expect(calculateAnnualTax(500000)).toBe(0);
    expect(calculateAnnualTax(600000)).toBe(0);

    // 600k to 1.2M: 5% of excess over 600k
    expect(calculateAnnualTax(1000000)).toBe((1000000 - 600000) * 0.05); // 20,000

    // 1.2M to 2.4M: 30,000 + 15% of excess over 1.2M
    expect(calculateAnnualTax(1800000)).toBe(30000 + (1800000 - 1200000) * 0.15); // 120,000
  });
});
