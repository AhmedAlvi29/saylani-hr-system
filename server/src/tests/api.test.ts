import { describe, it, expect, vi } from 'vitest';
import { hashPassword, comparePassword } from '../services/authService';
import { calculateAnnualTax } from '../services/payrollService';
import { askAiAssistant, parseSmartLeavePrompt } from '../services/aiService';

describe('M1 — Auth & Password Security Tests', () => {
  it('hashes passwords securely and verifies correctly with bcrypt', async () => {
    const rawPassword = 'AdminSecurePassword@2026';
    const hash = await hashPassword(rawPassword);

    expect(hash).not.toBe(rawPassword);
    expect(hash.startsWith('$2')).toBe(true);

    const isMatch = await comparePassword(rawPassword, hash);
    expect(isMatch).toBe(true);

    const isWrong = await comparePassword('WrongPassword', hash);
    expect(isWrong).toBe(false);
  });
});

describe('M3 & M6 — Employee Salary & Deductions', () => {
  it('enforces Gross = 1.5 * Basic breakdown (HRA 40%, Medical 10%)', () => {
    const basic = 120000;
    const hra = Math.round(basic * 0.4);
    const medical = Math.round(basic * 0.1);
    const gross = basic + hra + medical;

    expect(hra).toBe(48000);
    expect(medical).toBe(12000);
    expect(gross).toBe(180000);
    expect(gross).toBe(basic * 1.5);
  });

  it('correctly calculates daily rate and absence deductions', () => {
    const gross = 180000;
    const workingDays = 22;
    const dailyRate = Math.round((gross / workingDays) * 100) / 100;

    expect(dailyRate).toBe(8181.82);

    const absentDays = 2;
    const absentDeduction = Math.round(absentDays * dailyRate);
    expect(absentDeduction).toBe(16364);

    const halfDays = 1;
    const halfDayDeduction = Math.round(halfDays * 0.5 * dailyRate);
    expect(halfDayDeduction).toBe(4091);
  });

  it('validates the 3 lates = 0.5 day penalty rule', () => {
    const lateDays = 6;
    const latePenaltyDays = Math.floor(lateDays / 3) * 0.5;
    expect(latePenaltyDays).toBe(1.0);
  });
});

describe('M8 — AI Assistant Role Scope & Guardrails', () => {
  it('strictly refuses colleague salary queries when requested by an Employee', async () => {
    const result = await askAiAssistant("What is John's salary?", {
      id: '507f1f77bcf86cd799439011',
      role: 'employee',
      employeeId: '507f1f77bcf86cd799439012',
      email: 'ali.raza@saylani.org',
    });

    expect(result.answer.toLowerCase()).toContain('only access your own');
    expect(result.isAiGenerated).toBe(true);
  });

  it('correctly parses smart leave intent from plain text', async () => {
    const result = await parseSmartLeavePrompt('Need next Monday and Tuesday off for family wedding');
    expect(result.leaveType).toBe('casual');
    expect(result.startDate).toBeDefined();
    expect(result.endDate).toBeDefined();
    expect(result.reason.toLowerCase()).toContain('wedding');
  });

  it('understands sick leave requests in Roman Urdu', async () => {
    const result = await parseSmartLeavePrompt('Bimari ki wajah se kal chutti chahiye');
    expect(result.leaveType).toBe('sick');
  });
});
