import { describe, it, expect, vi, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';
import { registerCompanyAndAdmin } from '../services/authService';
import { Company } from '../models/Company';
import { User } from '../models/User';
import { Department } from '../models/Department';
import { Designation } from '../models/Designation';
import { Policy } from '../models/Policy';

describe('Company Registration & First-Time Admin Setup Service', () => {
  const JWT_SECRET = process.env.JWT_SECRET || 'saylani_hcm_super_secret_jwt_key_2026_secure';

  it('rejects registration if the administrator email already exists', async () => {
    // Mock User.findOne to simulate an existing account
    vi.spyOn(User, 'findOne').mockResolvedValueOnce({
      _id: 'user_existing_123',
      email: 'admin@saylani.org',
    } as any);

    await expect(
      registerCompanyAndAdmin({
        companyName: 'New Frontier Labs',
        adminName: 'Lead Admin',
        adminEmail: 'admin@saylani.org',
        adminPassword: 'Password@123',
      })
    ).rejects.toThrow(/already exists/);

    vi.restoreAllMocks();
  });

  it('rejects registration if the company name already exists (case-insensitive)', async () => {
    vi.spyOn(User, 'findOne').mockResolvedValueOnce(null);
    vi.spyOn(Company, 'findOne').mockResolvedValueOnce({
      _id: 'comp_existing_456',
      name: 'Saylani Systems Ltd',
    } as any);

    await expect(
      registerCompanyAndAdmin({
        companyName: 'saylani systems ltd',
        adminName: 'Saylani Lead',
        adminEmail: 'saylani.newadmin@domain.com',
        adminPassword: 'Password@123',
      })
    ).rejects.toThrow(/already registered/);

    vi.restoreAllMocks();
  });

  it('provisions company, admin, departments, designations, and policies when valid', async () => {
    const mockCompanyId = '6719ab238f4d9b1c9c450999';
    const mockAdminId = '6719ab238f4d9b1c9c450888';

    vi.spyOn(User, 'findOne').mockResolvedValueOnce(null);
    vi.spyOn(Company, 'findOne').mockResolvedValue(null);

    const createdCompanyMock = {
      _id: mockCompanyId,
      name: 'Nexora Systems',
      email: 'contact@nexora.io',
      officeStartTime: '09:00',
      graceMinutes: 15,
      halfDayThresholdHours: 5,
      address: 'Suite 404, Tech Park',
    };

    const createdAdminMock = {
      _id: mockAdminId,
      companyId: mockCompanyId,
      name: 'Nexora Admin',
      email: 'admin@nexora.io',
      role: 'admin',
      mustChangePassword: false,
      isActive: true,
    };

    vi.spyOn(Company, 'create').mockResolvedValueOnce(createdCompanyMock as any);
    vi.spyOn(User, 'create').mockResolvedValueOnce(createdAdminMock as any);
    vi.spyOn(Department, 'create').mockImplementation((data: any) =>
      Promise.resolve({ _id: `dept_${data.code}`, ...data } as any)
    );
    vi.spyOn(Designation, 'create').mockResolvedValue([] as any);
    vi.spyOn(Policy, 'create').mockResolvedValue([] as any);

    const result = await registerCompanyAndAdmin({
      companyName: 'Nexora Systems',
      companyEmail: 'contact@nexora.io',
      companyAddress: 'Suite 404, Tech Park',
      adminName: 'Nexora Admin',
      adminEmail: 'admin@nexora.io',
      adminPassword: 'SuperSecretPassword@2026',
    });

    expect(result.company.id).toBe(mockCompanyId);
    expect(result.company.name).toBe('Nexora Systems');
    expect(result.admin.email).toBe('admin@nexora.io');
    expect(result.admin.role).toBe('admin');
    expect(result.admin.companyId).toBe(mockCompanyId);

    // Verify token can be verified and carries companyId
    const decoded: any = jwt.verify(result.token, JWT_SECRET);
    expect(decoded.id).toBe(mockAdminId);
    expect(decoded.role).toBe('admin');
    expect(decoded.companyId).toBe(mockCompanyId);

    vi.restoreAllMocks();
  });
});
