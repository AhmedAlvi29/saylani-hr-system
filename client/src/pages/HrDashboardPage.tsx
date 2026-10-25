import React, { useState, useEffect } from 'react';
import { apiRequest } from '../services/api';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import {
  Users,
  UserCheck,
  CalendarDays,
  Clock,
  AlertCircle,
  Sparkles,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { useNavigate } from 'react-router-dom';

export const HrDashboardPage: React.FC = () => {
  const navigate = useNavigate();

  // Instant rehydration from sessionStorage so refresh is instant (0ms loading time)
  const [data, setData] = useState<any>(() => {
    try {
      const cached = sessionStorage.getItem('saylani_hcm_hr_dashboard');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState<boolean>(() => !sessionStorage.getItem('saylani_hcm_hr_dashboard'));
  const [isSummarizing, setIsSummarizing] = useState<boolean>(false);
  const [summaryBullets, setSummaryBullets] = useState<string[] | null>(null);

  const fetchMetrics = async (showLoading = !data) => {
    if (showLoading) setIsLoading(true);
    try {
      const res = await apiRequest('/dashboard/hr');
      setData(res);
      sessionStorage.setItem('saylani_hcm_hr_dashboard', JSON.stringify(res));
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics(!data);
  }, []);

  const handleAiSummarize = async () => {
    if (!data?.kpis) return;
    setIsSummarizing(true);
    try {
      const res = await apiRequest<{ summaryBullets: string[] }>('/ai/summarize-dashboard', {
        method: 'POST',
        body: JSON.stringify({ kpis: data.kpis }),
      });
      setSummaryBullets(res.summaryBullets);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSummarizing(false);
    }
  };

  const COLORS = ['#6366F1', '#14B8A6', '#F59E0B', '#EF4444', '#8B5CF6'];

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-8 w-48 bg-slate-200 animate-pulse rounded-lg" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-28 bg-slate-100 animate-pulse rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  const kpis = data?.kpis || {};
  const charts = data?.charts || {};

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header with Title & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-main">People Operations Dashboard</h1>
          <p className="text-xs text-slate-muted">Daily attendance overview, leave monitoring, and action items</p>
        </div>

        <button
          onClick={handleAiSummarize}
          disabled={isSummarizing}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-primary to-indigo-600 hover:from-primary-hover hover:to-indigo-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-soft transition-all transform hover:scale-[1.02] disabled:opacity-50"
        >
          <Sparkles className="w-4 h-4 animate-spin-slow" />
          {isSummarizing ? 'Generating AI Summary...' : 'Summarize with AI'}
        </button>
      </div>

      {/* AI Summary Highlight Box */}
      {summaryBullets && (
        <div className="p-5 bg-lavender-50 border border-indigo-200 rounded-2xl shadow-soft">
          <div className="flex items-center gap-2 mb-2.5">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="font-bold text-xs text-indigo-900 tracking-wide uppercase">
              AI HR Operations Briefing
            </span>
          </div>
          <ul className="space-y-1.5 text-xs text-slate-700 leading-relaxed list-disc list-inside">
            {summaryBullets.map((bullet, idx) => (
              <li key={idx} dangerouslySetInnerHTML={{ __html: bullet.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
            ))}
          </ul>
        </div>
      )}

      {/* 5 KPIs Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="hover:border-indigo-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-muted">Active Headcount</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-primary flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-extrabold text-slate-main">{kpis.headcount || 0}</span>
            <span className="text-[11px] text-slate-400 block mt-0.5">Total staff</span>
          </div>
        </Card>

        <Card className="hover:border-emerald-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-muted">Present Today</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-extrabold text-emerald-700">{kpis.presentToday || 0}</span>
            <span className="text-[11px] text-slate-400 block mt-0.5">On premise</span>
          </div>
        </Card>

        <Card className="hover:border-amber-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-muted">Late Today</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-extrabold text-amber-600">{kpis.lateToday || 0}</span>
            <span className="text-[11px] text-slate-400 block mt-0.5">&gt; 09:15 AM</span>
          </div>
        </Card>

        <Card className="hover:border-purple-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-muted">On Leave Today</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <CalendarDays className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-extrabold text-purple-700">{kpis.onLeaveToday || 0}</span>
            <span className="text-[11px] text-slate-400 block mt-0.5">Approved</span>
          </div>
        </Card>

        <Card
          className="hover:border-rose-200 cursor-pointer"
          action={
            <button
              onClick={() => navigate('/leaves')}
              className="text-xs text-primary font-semibold hover:underline flex items-center gap-0.5"
            >
              Review <ArrowRight className="w-3 h-3" />
            </button>
          }
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-muted">Pending Approvals</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-extrabold text-rose-600">{kpis.pendingApprovals || 0}</span>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              {kpis.pendingLeaves || 0} leaves, {kpis.pendingCorrections || 0} corrections
            </span>
          </div>
        </Card>
      </div>

      {/* 14-Day Attendance Trend Chart */}
      <Card title="Attendance Trend (Last 14 Days)" subtitle="Daily distribution of present, late, and leaves">
        <div className="h-64 w-full mt-3">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={charts.attendanceTrend || []}>
              <defs>
                <linearGradient id="presentGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="lateGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" stroke="#94A3B8" fontSize={11} />
              <YAxis stroke="#94A3B8" fontSize={11} />
              <Tooltip />
              <Area type="monotone" dataKey="present" stroke="#10B981" fillOpacity={1} fill="url(#presentGrad)" name="Present" />
              <Area type="monotone" dataKey="late" stroke="#F59E0B" fillOpacity={1} fill="url(#lateGrad)" name="Late" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Department Absenteeism & Top 5 Late Comers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 5 Late-Comers this month */}
        <Card title="Top 5 Late Arrivals This Month" subtitle="Employees requiring attendance review">
          <div className="overflow-x-auto mt-2">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="pb-2">Employee</th>
                  <th className="pb-2">Department</th>
                  <th className="pb-2 text-center">Late Count</th>
                  <th className="pb-2 text-right">Total Late Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {charts.topLateComers?.length > 0 ? (
                  charts.topLateComers.map((item: any, i: number) => (
                    <tr key={i} className="hover:bg-slate-50/50">
                      <td className="py-2.5 font-medium text-slate-main">
                        <div>{item.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{item.code}</div>
                      </td>
                      <td className="py-2.5 text-slate-600">{item.department || 'General'}</td>
                      <td className="py-2.5 text-center">
                        <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold border border-amber-200">
                          {item.lateCount}
                        </span>
                      </td>
                      <td className="py-2.5 text-right font-semibold text-slate-700">
                        {item.totalLateMinutes} mins
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-400">
                      No late arrivals recorded this month.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Leave Utilization by Type */}
        <Card title="Leave Utilization by Type" subtitle="Approved leave breakdown">
          <div className="h-60 w-full mt-2 flex items-center justify-center">
            {charts.leaveByType?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={charts.leaveByType}
                    dataKey="days"
                    nameKey="type"
                    cx="50%"
                    cy="50%"
                    outerRadius={75}
                    label
                  >
                    {charts.leaveByType.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-slate-400">No approved leave records yet</div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};
