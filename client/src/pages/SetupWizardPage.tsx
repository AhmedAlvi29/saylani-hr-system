import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../services/api';
import {
  Building2,
  Clock,
  ShieldCheck,
  MapPin,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const SetupWizardPage: React.FC = () => {
  const { login, checkSetup } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    companyName: 'Saylani Systems',
    code: 'SAYLANI',
    timezone: 'Asia/Karachi',
    officeStartTime: '09:00',
    graceMinutes: 15,
    halfDayThresholdHours: 5,
    weekendDays: [0, 6], // Sunday (0), Saturday (6)
    latitude: 24.8607,
    longitude: 67.0011,
    radiusMeters: 150,
    adminName: 'Organization Admin',
    adminEmail: 'admin@saylani.org',
    adminPassword: 'Admin@123456',
  });

  const handleFinish = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const response = await apiRequest<{
        company: any;
        admin: any;
        token: string;
      }>('/setup/initialize', {
        method: 'POST',
        body: JSON.stringify(formData),
      });

      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });

      login(response.token, response.admin);
      await checkSetup();
      navigate('/admin/dashboard');
    } catch (err: any) {
      setErrorMsg(err.message || 'Setup initialization failed.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-3xl border border-slate-border shadow-soft-lg p-6 sm:p-10 transition-all">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary text-white flex items-center justify-center font-bold text-2xl mx-auto shadow-soft mb-3">
            <Building2 className="w-7 h-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-main tracking-tight">
            Welcome to HCM Lite
          </h1>
          <p className="text-sm text-slate-muted mt-1 max-w-md mx-auto">
            Saylani Hackathon — First-Run Organization Setup Wizard
          </p>

          {/* Stepper Indicator */}
          <div className="flex items-center justify-center gap-2 mt-6">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    step === s
                      ? 'bg-primary text-white ring-4 ring-primary/20'
                      : step > s
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {step > s ? <CheckCircle2 className="w-4 h-4" /> : s}
                </div>
                {s < 3 && (
                  <div
                    className={`w-12 h-1 mx-1.5 rounded-full transition-all ${
                      step > s ? 'bg-emerald-500' : 'bg-slate-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
            {errorMsg}
          </div>
        )}

        {/* Step 1: Company Profile */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="pb-2 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-main">1. Company Profile</h2>
              <p className="text-xs text-slate-muted">Enter your company and regional preferences</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Company Name</label>
              <input
                type="text"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-border focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="e.g. Saylani Systems Ltd"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Organization Code</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-border focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder="SAYLANI"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Timezone</label>
                <select
                  value={formData.timezone}
                  onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                  className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-border focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                >
                  <option value="Asia/Karachi">Asia/Karachi (PKT +05:00)</option>
                  <option value="UTC">UTC (+00:00)</option>
                  <option value="Asia/Dubai">Asia/Dubai (+04:00)</option>
                </select>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={!formData.companyName.trim()}
                className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl text-sm font-semibold flex items-center gap-2 shadow-soft transition-all"
              >
                Continue <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Work Schedule & Geofence Rules */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="pb-2 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-main">2. Working Schedule & Geofence</h2>
              <p className="text-xs text-slate-muted">Challenge rules & timing configuration</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Office Start Time</label>
                <input
                  type="time"
                  value={formData.officeStartTime}
                  onChange={(e) => setFormData({ ...formData, officeStartTime: e.target.value })}
                  className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-border focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
                <span className="text-[10px] text-slate-400">Default: 09:00 AM</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Grace Period (Minutes)</label>
                <input
                  type="number"
                  min="0"
                  max="60"
                  value={formData.graceMinutes}
                  onChange={(e) => setFormData({ ...formData, graceMinutes: parseInt(e.target.value, 10) || 0 })}
                  className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-border focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
                <span className="text-[10px] text-slate-400">Default: 15 mins (late after 09:15)</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Half Day Threshold (Hours)</label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={formData.halfDayThresholdHours}
                  onChange={(e) =>
                    setFormData({ ...formData, halfDayThresholdHours: parseInt(e.target.value, 10) || 5 })
                  }
                  className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-border focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
                <span className="text-[10px] text-slate-400">Default: &lt; 5 hours = Half Day</span>
              </div>
            </div>

            <div className="pt-2">
              <label className="block text-xs font-semibold text-slate-700 mb-2">Office Geofence Location</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div>
                  <label className="text-[11px] text-slate-500 font-medium">Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) || 0 })}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-border mt-1"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-500 font-medium">Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) || 0 })}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-border mt-1"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-500 font-medium">Radius (Meters)</label>
                  <input
                    type="number"
                    value={formData.radiusMeters}
                    onChange={(e) => setFormData({ ...formData, radiusMeters: parseInt(e.target.value, 10) || 150 })}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-border mt-1"
                  />
                </div>
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-primary" /> Used for mobile/web camera check-in verification
              </p>
            </div>

            <div className="pt-4 flex justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl text-sm font-semibold flex items-center gap-2 shadow-soft transition-all"
              >
                Continue <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Admin Account Creation */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="pb-2 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-main">3. Initial Super Admin Account</h2>
              <p className="text-xs text-slate-muted">This account will hold full company and system governance</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Admin Full Name</label>
              <input
                type="text"
                value={formData.adminName}
                onChange={(e) => setFormData({ ...formData, adminName: e.target.value })}
                className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-border focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="Super Admin"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Admin Email Address</label>
              <input
                type="email"
                value={formData.adminEmail}
                onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-border focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="admin@saylani.org"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Secure Password</label>
              <input
                type="password"
                value={formData.adminPassword}
                onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
                className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-border focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="••••••••••••"
              />
            </div>

            <div className="p-3.5 rounded-xl bg-lavender-50 border border-indigo-200 text-indigo-950 text-xs flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div>
                <strong>Notice:</strong> Once setup is completed, the wizard is locked and will automatically transition into the live HCM system.
              </div>
            </div>

            <div className="pt-4 flex justify-between">
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={isSubmitting}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button
                type="button"
                onClick={handleFinish}
                disabled={isSubmitting || !formData.adminEmail || !formData.adminPassword}
                className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl text-sm font-semibold flex items-center gap-2 shadow-soft transition-all disabled:opacity-50"
              >
                {isSubmitting ? 'Initializing Company...' : 'Complete Setup & Launch'}
                <CheckCircle2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
