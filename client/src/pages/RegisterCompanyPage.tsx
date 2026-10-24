import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../services/api';
import {
  Building2,
  Lock,
  Mail,
  User,
  MapPin,
  Clock,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

export const RegisterCompanyPage: React.FC = () => {
  const { login, setWelcomeMessage } = useAuth();
  const navigate = useNavigate();

  // Company Details state
  const [companyName, setCompanyName] = useState<string>('');
  const [companyEmail, setCompanyEmail] = useState<string>('');
  const [companyAddress, setCompanyAddress] = useState<string>('');
  const [officeStartTime, setOfficeStartTime] = useState<string>('09:00');
  const [graceMinutes, setGraceMinutes] = useState<number>(15);
  const [halfDayThresholdHours, setHalfDayThresholdHours] = useState<number>(5);
  const [latitude, setLatitude] = useState<number>(24.8607);
  const [longitude, setLongitude] = useState<number>(67.0011);
  const [radiusMeters, setRadiusMeters] = useState<number>(150);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState<boolean>(false);

  // Initial Administrator Details state
  const [adminName, setAdminName] = useState<string>('');
  const [adminEmail, setAdminEmail] = useState<string>('');
  const [adminPassword, setAdminPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');

  // UI state
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [inlineErrors, setInlineErrors] = useState<{ [key: string]: string }>({});

  const validateForm = (): boolean => {
    const errors: { [key: string]: string } = {};

    // Company Validation
    if (!companyName.trim()) {
      errors.companyName = 'Company name is required.';
    } else if (companyName.trim().length < 2) {
      errors.companyName = 'Company name must be at least 2 characters.';
    }

    if (companyEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(companyEmail.trim())) {
      errors.companyEmail = 'Please provide a valid company email format.';
    }

    // Admin Validation
    if (!adminName.trim()) {
      errors.adminName = 'Administrator full name is required.';
    } else if (adminName.trim().length < 2) {
      errors.adminName = 'Admin name must be at least 2 characters.';
    }

    if (!adminEmail.trim()) {
      errors.adminEmail = 'Administrator email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail.trim())) {
      errors.adminEmail = 'Please provide a valid email address.';
    }

    if (!adminPassword) {
      errors.adminPassword = 'Password is required.';
    } else if (adminPassword.length < 6) {
      errors.adminPassword = 'Password must be at least 6 characters.';
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Confirmation password is required.';
    } else if (adminPassword !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.';
    }

    setInlineErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await apiRequest<{
        company: {
          id: string;
          name: string;
          email?: string;
        };
        admin: {
          id: string;
          name: string;
          email: string;
          role: string;
          companyId: string;
          companyName: string;
        };
        token: string;
      }>('/auth/register-company', {
        method: 'POST',
        body: JSON.stringify({
          companyName: companyName.trim(),
          companyEmail: companyEmail.trim() || undefined,
          companyAddress: companyAddress.trim() || undefined,
          officeStartTime,
          graceMinutes: Number(graceMinutes),
          halfDayThresholdHours: Number(halfDayThresholdHours),
          weekendDays: [0, 6], // Sun, Sat
          latitude: Number(latitude),
          longitude: Number(longitude),
          radiusMeters: Number(radiusMeters),
          adminName: adminName.trim(),
          adminEmail: adminEmail.trim().toLowerCase(),
          adminPassword,
          confirmPassword,
        }),
      });

      // 1. Establish session & company context
      login(response.token, response.admin as any, response.company.name);

      // 2. Set welcome message
      setWelcomeMessage('Your company has been registered successfully. Welcome to HCM Lite!');

      // 3. Redirect to Admin Dashboard
      navigate('/admin/dashboard', { replace: true });
    } catch (err: any) {
      setErrorMessage(err.message || 'Registration failed. Please check the entered information.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-2xl bg-white rounded-3xl border border-slate-border shadow-soft-lg p-6 sm:p-10 transition-all">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-5 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center font-bold text-xl shadow-soft">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-main tracking-tight">
                Register Your Company
              </h2>
              <p className="text-xs text-slate-muted mt-0.5">
                Set up your organization workspace and initial Administrator account
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/login')}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-primary transition-colors py-2 px-3 rounded-xl hover:bg-slate-50 border border-slate-200"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>
        </div>

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{errorMessage}</div>
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-6">
          {/* Section 1: Company Details */}
          <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-200/80 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
              <Building2 className="w-4 h-4 text-primary" />
              <span>1. Organization & Workplace Details</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Company Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => {
                    setCompanyName(e.target.value);
                    if (inlineErrors.companyName) setInlineErrors({ ...inlineErrors, companyName: '' });
                  }}
                  className={`w-full text-xs px-3.5 py-2.5 rounded-xl border bg-white ${
                    inlineErrors.companyName
                      ? 'border-rose-400 focus:ring-rose-200'
                      : 'border-slate-border focus:border-primary focus:ring-primary/20'
                  } focus:ring-2`}
                  placeholder="e.g. Acme Innovations Ltd"
                />
                {inlineErrors.companyName && (
                  <p className="text-[11px] text-rose-600 mt-1">{inlineErrors.companyName}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Company Official Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    value={companyEmail}
                    onChange={(e) => {
                      setCompanyEmail(e.target.value);
                      if (inlineErrors.companyEmail) setInlineErrors({ ...inlineErrors, companyEmail: '' });
                    }}
                    className={`w-full text-xs pl-10 pr-3.5 py-2.5 rounded-xl border bg-white ${
                      inlineErrors.companyEmail
                        ? 'border-rose-400 focus:ring-rose-200'
                        : 'border-slate-border focus:border-primary focus:ring-primary/20'
                    } focus:ring-2`}
                    placeholder="contact@company.com"
                  />
                </div>
                {inlineErrors.companyEmail && (
                  <p className="text-[11px] text-rose-600 mt-1">{inlineErrors.companyEmail}</p>
                )}
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Head Office Address (Optional)
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={companyAddress}
                    onChange={(e) => setCompanyAddress(e.target.value)}
                    className="w-full text-xs pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-border bg-white focus:border-primary focus:ring-2 focus:ring-primary/20"
                    placeholder="e.g. Plot 12-B, Tech Corridor, Shahrah-e-Faisal, Karachi"
                  />
                </div>
              </div>
            </div>

            {/* Toggle Working Hours & Geofence Defaults */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                className="text-xs font-semibold text-primary hover:underline flex items-center gap-1.5"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>
                  {showAdvancedSettings ? 'Hide Office Timing Settings' : 'Customize Office Hours & Geofencing (Optional)'}
                </span>
              </button>

              {showAdvancedSettings && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-3 pt-3 border-t border-slate-200/60">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Office Start Time
                    </label>
                    <input
                      type="time"
                      value={officeStartTime}
                      onChange={(e) => setOfficeStartTime(e.target.value)}
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-border bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Grace Period (Minutes)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={60}
                      value={graceMinutes}
                      onChange={(e) => setGraceMinutes(Number(e.target.value))}
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-border bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Half-Day Threshold (Hours)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={8}
                      value={halfDayThresholdHours}
                      onChange={(e) => setHalfDayThresholdHours(Number(e.target.value))}
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-border bg-white"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Initial Administrator Account */}
          <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-200/80 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-teal-600" />
              <span>2. Initial Administrator Account</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Admin Full Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={adminName}
                    onChange={(e) => {
                      setAdminName(e.target.value);
                      if (inlineErrors.adminName) setInlineErrors({ ...inlineErrors, adminName: '' });
                    }}
                    className={`w-full text-xs pl-10 pr-3.5 py-2.5 rounded-xl border bg-white ${
                      inlineErrors.adminName
                        ? 'border-rose-400 focus:ring-rose-200'
                        : 'border-slate-border focus:border-primary focus:ring-primary/20'
                    } focus:ring-2`}
                    placeholder="e.g. John Doe"
                  />
                </div>
                {inlineErrors.adminName && (
                  <p className="text-[11px] text-rose-600 mt-1">{inlineErrors.adminName}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Admin Work Email <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={adminEmail}
                    onChange={(e) => {
                      setAdminEmail(e.target.value);
                      if (inlineErrors.adminEmail) setInlineErrors({ ...inlineErrors, adminEmail: '' });
                    }}
                    className={`w-full text-xs pl-10 pr-3.5 py-2.5 rounded-xl border bg-white ${
                      inlineErrors.adminEmail
                        ? 'border-rose-400 focus:ring-rose-200'
                        : 'border-slate-border focus:border-primary focus:ring-primary/20'
                    } focus:ring-2`}
                    placeholder="admin@company.com"
                  />
                </div>
                {inlineErrors.adminEmail && (
                  <p className="text-[11px] text-rose-600 mt-1">{inlineErrors.adminEmail}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Admin Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    required
                    value={adminPassword}
                    onChange={(e) => {
                      setAdminPassword(e.target.value);
                      if (inlineErrors.adminPassword) setInlineErrors({ ...inlineErrors, adminPassword: '' });
                    }}
                    className={`w-full text-xs pl-10 pr-3.5 py-2.5 rounded-xl border bg-white ${
                      inlineErrors.adminPassword
                        ? 'border-rose-400 focus:ring-rose-200'
                        : 'border-slate-border focus:border-primary focus:ring-primary/20'
                    } focus:ring-2`}
                    placeholder="Min. 6 characters"
                  />
                </div>
                {inlineErrors.adminPassword && (
                  <p className="text-[11px] text-rose-600 mt-1">{inlineErrors.adminPassword}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Confirm Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (inlineErrors.confirmPassword) setInlineErrors({ ...inlineErrors, confirmPassword: '' });
                    }}
                    className={`w-full text-xs pl-10 pr-3.5 py-2.5 rounded-xl border bg-white ${
                      inlineErrors.confirmPassword
                        ? 'border-rose-400 focus:ring-rose-200'
                        : 'border-slate-border focus:border-primary focus:ring-primary/20'
                    } focus:ring-2`}
                    placeholder="Re-enter password"
                  />
                </div>
                {inlineErrors.confirmPassword && (
                  <p className="text-[11px] text-rose-600 mt-1">{inlineErrors.confirmPassword}</p>
                )}
              </div>
            </div>
          </div>

          {/* Value Proposition Callout */}
          <div className="p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-100 flex items-center gap-2.5 text-xs text-indigo-900">
            <Sparkles className="w-4 h-4 text-primary shrink-0" />
            <span>
              Your company will be initialized with dedicated tenant isolation, default departments (Engineering, HR, Operations), standard leave quotas, and HR policies.
            </span>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs sm:text-sm font-semibold shadow-soft flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Registering Your Organization...</span>
              </>
            ) : (
              <>
                <span>Complete Registration & Launch Workspace</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
