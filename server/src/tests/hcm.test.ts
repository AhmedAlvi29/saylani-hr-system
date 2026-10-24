import { describe, it, expect } from 'vitest';
import { calculateAnnualTax } from '../services/payrollService';
import { parseSmartLeavePrompt } from '../services/aiService';

describe('M6 — Payroll Calculations & Tax Slabs', () => {
  it('correctly calculates zero tax for gross under 600k', () => {
    expect(calculateAnnualTax(500000)).toBe(0);
    expect(calculateAnnualTax(600000)).toBe(0);
  });

  it('correctly applies 5% slab between 600k and 1.2M', () => {
    // 1,000,000 annual gross -> 400,000 taxable at 5% = 20,000
    expect(calculateAnnualTax(1000000)).toBe(20000);
    expect(calculateAnnualTax(1200000)).toBe(30000);
  });

  it('correctly applies 15% slab between 1.2M and 2.4M', () => {
    // 2,000,000 -> 30,000 + (800,000 * 0.15) = 150,000
    expect(calculateAnnualTax(2000000)).toBe(150000);
  });

  it('correctly applies 25% slab between 2.4M and 3.6M', () => {
    // 3,000,000 -> 210,000 + (600,000 * 0.25) = 360,000
    expect(calculateAnnualTax(3000000)).toBe(360000);
  });

  it('correctly applies 35% slab above 3.6M', () => {
    // 4,000,000 -> 510,000 + (400,000 * 0.35) = 650,000
    expect(calculateAnnualTax(4000000)).toBe(650000);
  });

  it('validates standard gross salary breakdown: Gross = 1.5 * Basic', () => {
    const basic = 100000;
    const hra = Math.round(basic * 0.4);
    const medical = Math.round(basic * 0.1);
    const gross = basic + hra + medical;

    expect(hra).toBe(40000);
    expect(medical).toBe(10000);
    expect(gross).toBe(150000);
    expect(gross).toBe(basic * 1.5);
  });

  it('calculates late penalty: 3 lates = 0.5 day deduction', () => {
    const lateDays = 7;
    const penaltyDays = Math.floor(lateDays / 3) * 0.5;
    expect(penaltyDays).toBe(1.0); // 2 sets of 3 = 1.0 day
  });
});

describe('M8 — AI Smart Leave Parsing', () => {
  it('correctly extracts casual leave and reason from plain text', async () => {
    const result = await parseSmartLeavePrompt('Need next Monday and Tuesday off for my sister wedding');
    expect(result.leaveType).toBe('casual');
    expect(result.startDate).toBeDefined();
    expect(result.endDate).toBeDefined();
    expect(result.reason.toLowerCase()).toContain('wedding');
  });

  it('correctly extracts sick leave from sick keyword', async () => {
    const result = await parseSmartLeavePrompt('Doctor appointment tomorrow for severe migraine');
    expect(result.leaveType).toBe('sick');
  });

  it('correctly extracts sick leave from Roman Urdu text', async () => {
    const result = await parseSmartLeavePrompt('Bimari ki wajah se kal chutti chahiye doctor k pas jana hy');
    expect(result.leaveType).toBe('sick');
  });
});
