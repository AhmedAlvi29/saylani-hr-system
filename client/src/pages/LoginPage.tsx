import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../services/api';
import { Building2, Lock, Mail, ArrowRight, ShieldCheck, UserCheck } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, companyName } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState<string>('admin@saylani.org');
  const [password, setPassword] = useState<string>('Admin@123456');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const data = await apiRequest<{
        token: string;
        user: any;
      }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      login(data.token, data.user);

      if (data.user.mustChangePassword) {
        navigate('/change-password');
      } else if (data.user.role === 'admin') {
        navigate('/admin/dashboard');
      } else if (data.user.role === 'hr') {
        navigate('/hr/dashboard');
      } else {
        navigate('/employee/dashboard');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Login failed. Please verify your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const setQuickCredentials = (role: 'admin' | 'hr' | 'employee') => {
    if (role === 'admin') {
      setEmail('admin@saylani.org');
      setPassword('Admin@123456');
    } else if (role === 'hr') {
      setEmail('hr@saylani.org');
      setPassword('Hr@123456');
    } else {
      setEmail('ali.raza@saylani.org');
      setPassword('Employee@123456');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-border shadow-soft-lg p-8 sm:p-10 transition-all">
        {/* Brand */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center font-bold text-xl mx-auto shadow-soft mb-3">
            <Building2 className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-slate-main tracking-tight">Sign in to HCM Lite</h2>
          <p className="text-xs text-slate-muted mt-1">{companyName}</p>
        </div>

        {/* Quick Demo Switcher Pills for Hackathon Judges */}
        <div className="mb-6 p-2.5 bg-slate-50 border border-slate-200 rounded-2xl">
          <div className="text-[11px] font-semibold text-slate-500 mb-1.5 text-center flex items-center justify-center gap-1">
            <UserCheck className="w-3.5 h-3.5 text-primary" /> Quick Demo Fill (Judging Mode):
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => setQuickCredentials('admin')}
              className="py-1.5 px-2 text-xs font-semibold rounded-xl bg-white hover:bg-lavender-100 text-primary border border-slate-200 shadow-soft-sm transition-all"
            >
              Admin
            </button>
            <button
              type="button"
              onClick={() => setQuickCredentials('hr')}
              className="py-1.5 px-2 text-xs font-semibold rounded-xl bg-white hover:bg-teal-50 text-teal-700 border border-slate-200 shadow-soft-sm transition-all"
            >
              HR
            </button>
            <button
              type="button"
              onClick={() => setQuickCredentials('employee')}
              className="py-1.5 px-2 text-xs font-semibold rounded-xl bg-white hover:bg-sky-50 text-sky-700 border border-slate-200 shadow-soft-sm transition-all"
            >
              Employee
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full text-xs pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-border focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="you@company.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full text-xs pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-border focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="••••••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-semibold shadow-soft flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
