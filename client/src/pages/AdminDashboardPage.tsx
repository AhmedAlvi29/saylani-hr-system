import React, { useState, useEffect } from 'react';
import { apiRequest } from '../services/api';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import {
  Users,
  TrendingDown,
  DollarSign,
  Briefcase,
  Sparkles,
  ShieldAlert,
  ArrowUpRight,
  Clock,
  Layers,
} from 'lucide-react';
import {
  ResponsiveContainer,
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

export const AdminDashboardPage: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSummarizing, setIsSummarizing] = useState<boolean>(false);
  const [summaryBullets, setSummaryBullets] = useState<string[] | null>(null);

  const fetchMetrics = async () => {
    setIsLoading(true);
    try {
      const res = await apiRequest('/dashboard/admin');
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
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

  const COLORS = ['#6366F1', '#14B8A6', '#F59E0B', '#EC4899', '#8B5CF6'];

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-8 w-48 bg-slate-200 animate-pulse rounded-lg" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
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
      {/* Header with Title & AI Summarize Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-main">Executive Overview</h1>
          <p className="text-xs text-slate-muted">Organization metrics, workforce statistics, and payroll governance</p>
        </div>

        <button
          onClick={handleAiSummarize}
          disabled={isSummarizing}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-primary to-indigo-600 hover:from-primary-hover hover:to-indigo-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-soft transition-all transform hover:scale-[1.02] disabled:opacity-50"
        >
          <Sparkles className="w-4 h-4 animate-spin-slow" />
          {isSummarizing ? 'Generating AI Insights...' : 'Summarize with AI'}
        </button>
      </div>

      {/* AI Summary Highlight Box */}
      {summaryBullets && (
        <div className="p-5 bg-lavender-50 border border-indigo-200 rounded-2xl shadow-soft">
          <div className="flex items-center gap-2 mb-2.5">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="font-bold text-xs text-indigo-900 tracking-wide uppercase">
              AI Executive Summary
            </span>
            <span className="text-[10px] bg-white px-2 py-0.5 rounded text-primary font-medium border border-indigo-200">
              Verified Data
            </span>
          </div>
          <ul className="space-y-1.5 text-xs text-slate-700 leading-relaxed list-disc list-inside">
            {summaryBullets.map((bullet, idx) => (
              <li key={idx} dangerouslySetInnerHTML={{ __html: bullet.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
            ))}
          </ul>
        </div>
      )}

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:border-indigo-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-muted">Total Headcount</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-primary flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-extrabold text-slate-main">{kpis.headcount || 0}</span>
            <span className="text-xs text-slate-400 ml-2">Active Employees</span>
          </div>
        </Card>

        <Card className="hover:border-teal-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-muted">Attrition Rate YTD</span>
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-accent flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-extrabold text-slate-main">{kpis.attritionRateYtd || 0}%</span>
            <span className="text-xs text-slate-400 ml-2">{kpis.exitsThisYear || 0} exits</span>
          </div>
        </Card>

        <Card className="hover:border-indigo-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-muted">Monthly Payroll Cost</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-extrabold text-slate-main">
              PKR {(kpis.payrollCost || 0).toLocaleString()}
            </span>
            <span className="text-xs text-slate-400 ml-1.5">Gross</span>
          </div>
        </Card>

        <Card className="hover:border-indigo-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-muted">Average Gross Salary</span>
            <div className="w-9 h-9 rounded-xl bg-lavender-100 text-indigo-700 flex items-center justify-center">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-extrabold text-slate-main">
              PKR {(kpis.avgSalary || 0).toLocaleString()}
            </span>
            <span className="text-xs text-slate-400 ml-1.5">/ Month</span>
          </div>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Headcount by Department */}
        <Card title="Department Headcount Distribution" subtitle="Active employees per department">
          <div className="h-64 w-full mt-2">
            {charts.headcountByDept?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.headcountByDept}>
                  <XAxis dataKey="department" stroke="#94A3B8" fontSize={11} />
                  <YAxis stroke="#94A3B8" fontSize={11} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#FFF', borderRadius: '12px', border: '1px solid #E2E8F0' }}
                  />
                  <Bar dataKey="count" fill="#6366F1" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No departmental data registered yet
              </div>
            )}
          </div>
        </Card>

        {/* Payroll Cost by Department */}
        <Card title="Payroll Cost by Department" subtitle="Monthly total gross allocation">
          <div className="h-64 w-full mt-2">
            {charts.payrollByDept?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.payrollByDept}>
                  <XAxis dataKey="department" stroke="#94A3B8" fontSize={11} />
                  <YAxis stroke="#94A3B8" fontSize={11} />
                  <Tooltip
                    formatter={(val: any) => `PKR ${Number(val).toLocaleString()}`}
                    contentStyle={{ backgroundColor: '#FFF', borderRadius: '12px', border: '1px solid #E2E8F0' }}
                  />
                  <Bar dataKey="cost" fill="#14B8A6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No payroll calculated yet
              </div>
            )}
          </div>
        </Card>

        {/* Gender Distribution */}
        <Card title="Gender Diversity" subtitle="Headcount ratio by gender">
          <div className="h-60 w-full mt-2 flex items-center justify-center">
            {charts.genderDistribution?.some((g: any) => g.value > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={charts.genderDistribution}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label
                  >
                    {charts.genderDistribution.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-slate-400">No employee records</div>
            )}
          </div>
        </Card>

        {/* Tenure Distribution */}
        <Card title="Employee Tenure Distribution" subtitle="Workforce experience brackets">
          <div className="h-60 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.tenureDistribution || []}>
                <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} />
                <YAxis stroke="#94A3B8" fontSize={11} />
                <Tooltip />
                <Bar dataKey="count" fill="#8B5CF6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Live Audit Log Feed */}
      <Card title="Live Organization Audit Feed" subtitle="Recent governance and system operations">
        <div className="overflow-x-auto mt-2">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="pb-2.5">Time</th>
                <th className="pb-2.5">Actor</th>
                <th className="pb-2.5">Action</th>
                <th className="pb-2.5">Entity</th>
                <th className="pb-2.5">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data?.auditFeed?.length > 0 ? (
                data.auditFeed.map((log: any) => (
                  <tr key={log._id} className="hover:bg-slate-50/50">
                    <td className="py-2.5 text-slate-400 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-2.5 font-medium text-slate-700">{log.actorEmail}</td>
                    <td className="py-2.5">
                      <span className="font-mono text-[11px] bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-2.5 text-slate-600">{log.entity}</td>
                    <td className="py-2.5 text-slate-500 max-w-xs truncate">{log.details || '-'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-400">
                    No audit records logged yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
