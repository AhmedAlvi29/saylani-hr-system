import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../services/api';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import {
  CalendarDays,
  Sparkles,
  Plus,
  CheckCircle2,
  AlertCircle,
  Clock,
  Check,
  X,
  RotateCcw,
} from 'lucide-react';

export const LeavesPage: React.FC = () => {
  const { user } = useAuth();
  const role = user?.role || 'employee';
  const isManager = role === 'admin' || role === 'hr';

  const [leaveBalance, setLeaveBalance] = useState<any>(null);
  const [myLeaves, setMyLeaves] = useState<any[]>([]);
  const [allRequests, setAllRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Apply Modal
  const [isApplyModalOpen, setIsApplyModalOpen] = useState<boolean>(false);
  const [applyForm, setApplyForm] = useState({
    leaveType: 'annual' as 'annual' | 'sick' | 'casual' | 'unpaid',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    reason: '',
  });
  const [calculatedDays, setCalculatedDays] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [applyError, setApplyError] = useState<string | null>(null);

  // Smart Leave AI Modal
  const [isSmartLeaveModalOpen, setIsSmartLeaveModalOpen] = useState<boolean>(false);
  const [smartPrompt, setSmartPrompt] = useState<string>('');
  const [isParsingSmart, setIsParsingSmart] = useState<boolean>(false);

  // Review Modal (Manager)
  const [selectedRequestToReview, setSelectedRequestToReview] = useState<any>(null);
  const [reviewAction, setReviewAction] = useState<'approved' | 'rejected'>('approved');
  const [reviewComment, setReviewComment] = useState<string>('');

  const fetchLeaveData = async () => {
    setIsLoading(true);
    try {
      const [balanceRes, myLeavesRes] = await Promise.all([
        apiRequest('/leaves/balance'),
        apiRequest('/leaves/my-history'),
      ]);
      setLeaveBalance(balanceRes);
      setMyLeaves(myLeavesRes || []);

      if (isManager) {
        const requestsRes = await apiRequest('/leaves/requests');
        setAllRequests(requestsRes || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaveData();
  }, []);

  // Calculate working days dynamically when dates change
  useEffect(() => {
    const calc = async () => {
      if (applyForm.startDate && applyForm.endDate && applyForm.startDate <= applyForm.endDate) {
        try {
          const res = await apiRequest<{ workingDays: number }>(
            `/leaves/calculate-days?startDate=${applyForm.startDate}&endDate=${applyForm.endDate}`
          );
          setCalculatedDays(res.workingDays);
        } catch (err) {
          // ignore
        }
      }
    };
    calc();
  }, [applyForm.startDate, applyForm.endDate]);

  // Apply Submit
  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setApplyError(null);

    try {
      await apiRequest('/leaves/apply', {
        method: 'POST',
        body: JSON.stringify(applyForm),
      });

      setIsApplyModalOpen(false);
      setApplyForm({
        leaveType: 'annual',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        reason: '',
      });
      fetchLeaveData();
    } catch (err: any) {
      setApplyError(err.message || 'Failed to submit leave application.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Smart Leave AI submit
  const handleSmartLeaveParse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!smartPrompt.trim()) return;
    setIsParsingSmart(true);

    try {
      const res = await apiRequest<{
        leaveType: 'annual' | 'sick' | 'casual' | 'unpaid';
        startDate: string;
        endDate: string;
        reason: string;
      }>('/ai/smart-leave', {
        method: 'POST',
        body: JSON.stringify({ prompt: smartPrompt }),
      });

      setApplyForm(res);
      setIsSmartLeaveModalOpen(false);
      setSmartPrompt('');
      setIsApplyModalOpen(true);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsParsingSmart(false);
    }
  };

  // Cancel Leave
  const handleCancelLeave = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this leave application?')) return;
    try {
      await apiRequest(`/leaves/requests/${id}/cancel`, { method: 'POST' });
      fetchLeaveData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Review Leave Submit (Manager)
  const handleReviewSubmit = async () => {
    if (!selectedRequestToReview) return;
    try {
      await apiRequest(`/leaves/requests/${selectedRequestToReview._id}/review`, {
        method: 'POST',
        body: JSON.stringify({ action: reviewAction, comment: reviewComment }),
      });

      setSelectedRequestToReview(null);
      setReviewComment('');
      fetchLeaveData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const balances = leaveBalance?.available || {
    annual: 14,
    sick: 8,
    casual: 10,
    unpaidUsed: 0,
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-main">Leave Management</h1>
          <p className="text-xs text-slate-muted">
            Quotas, overlap-protected leave applications, and approval workflows
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Smart Leave AI Button */}
          <button
            onClick={() => setIsSmartLeaveModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-indigo-50 to-lavender-100 hover:from-indigo-100 hover:to-lavender-200 text-primary border border-indigo-200 rounded-xl text-xs font-semibold shadow-soft transition-all"
          >
            <Sparkles className="w-4 h-4 text-primary animate-pulse" />
            <span>Smart Leave AI</span>
          </button>

          <button
            onClick={() => setIsApplyModalOpen(true)}
            className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-soft transition-all"
          >
            <Plus className="w-4 h-4" /> Apply for Leave
          </button>
        </div>
      </div>

      {/* Quotas Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="hover:border-indigo-200">
          <span className="text-xs font-semibold text-slate-400">Annual Leave</span>
          <div className="mt-2 text-2xl font-black text-slate-main">
            {balances.annual} <span className="text-xs font-normal text-slate-400">/ 14 days left</span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">Paid yearly vacation</span>
        </Card>

        <Card className="hover:border-teal-200">
          <span className="text-xs font-semibold text-slate-400">Sick Leave</span>
          <div className="mt-2 text-2xl font-black text-slate-main">
            {balances.sick} <span className="text-xs font-normal text-slate-400">/ 8 days left</span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">Medical & health</span>
        </Card>

        <Card className="hover:border-amber-200">
          <span className="text-xs font-semibold text-slate-400">Casual Leave</span>
          <div className="mt-2 text-2xl font-black text-slate-main">
            {balances.casual} <span className="text-xs font-normal text-slate-400">/ 10 days left</span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">Personal errands & events</span>
        </Card>

        <Card className="hover:border-purple-200">
          <span className="text-xs font-semibold text-slate-400">Unpaid Leave</span>
          <div className="mt-2 text-2xl font-black text-slate-main">
            {balances.unpaidUsed} <span className="text-xs font-normal text-slate-400">days taken</span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">Subject to salary deduction</span>
        </Card>
      </div>

      {/* HR / Admin Approval Inbox */}
      {isManager && (
        <Card title="Management Leave Approval Inbox" subtitle="Pending requests requiring review">
          <div className="overflow-x-auto mt-2">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="pb-3 px-3">Employee</th>
                  <th className="pb-3 px-3">Leave Type</th>
                  <th className="pb-3 px-3">Dates</th>
                  <th className="pb-3 px-3">Working Days</th>
                  <th className="pb-3 px-3">Reason</th>
                  <th className="pb-3 px-3">Status</th>
                  <th className="pb-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {allRequests.length > 0 ? (
                  allRequests.map((req) => (
                    <tr key={req._id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-3 font-medium text-slate-main">
                        <div>
                          {req.employeeId?.firstName} {req.employeeId?.lastName}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {req.employeeId?.employeeCode}
                        </div>
                      </td>
                      <td className="py-3 px-3 capitalize font-semibold">{req.leaveType}</td>
                      <td className="py-3 px-3 font-mono text-slate-600">
                        {req.startDate} to {req.endDate}
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-main">{req.workingDays} days</td>
                      <td className="py-3 px-3 text-slate-600 max-w-xs truncate">{req.reason}</td>
                      <td className="py-3 px-3">
                        <Badge status={req.status} />
                      </td>
                      <td className="py-3 px-3 text-right">
                        {req.status === 'pending' ? (
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setSelectedRequestToReview(req);
                                setReviewAction('rejected');
                              }}
                              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-semibold flex items-center gap-1"
                            >
                              <X className="w-3.5 h-3.5" /> Reject
                            </button>
                            <button
                              onClick={() => {
                                setSelectedRequestToReview(req);
                                setReviewAction('approved');
                              }}
                              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-semibold flex items-center gap-1"
                            >
                              <Check className="w-3.5 h-3.5" /> Approve
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 capitalize">
                            {req.reviewedBy?.name ? `By ${req.reviewedBy.name}` : req.status}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No leave requests in the queue.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* My Leave Requests Table */}
      <Card title="My Leave History" subtitle="Your personal applications and approvals">
        <div className="overflow-x-auto mt-2">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="pb-3 px-3">Type</th>
                <th className="pb-3 px-3">Start Date</th>
                <th className="pb-3 px-3">End Date</th>
                <th className="pb-3 px-3">Working Days</th>
                <th className="pb-3 px-3">Reason</th>
                <th className="pb-3 px-3">Status</th>
                <th className="pb-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {myLeaves.length > 0 ? (
                myLeaves.map((lv) => (
                  <tr key={lv._id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-3 font-semibold capitalize">{lv.leaveType}</td>
                    <td className="py-3 px-3 font-mono">{lv.startDate}</td>
                    <td className="py-3 px-3 font-mono">{lv.endDate}</td>
                    <td className="py-3 px-3 font-bold">{lv.workingDays} d</td>
                    <td className="py-3 px-3 text-slate-600 max-w-xs truncate">{lv.reason}</td>
                    <td className="py-3 px-3">
                      <Badge status={lv.status} />
                    </td>
                    <td className="py-3 px-3 text-right">
                      {lv.status === 'pending' && (
                        <button
                          onClick={() => handleCancelLeave(lv._id)}
                          className="text-xs text-rose-600 hover:underline font-semibold"
                        >
                          Cancel Request
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No leave requests submitted yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Apply Leave Modal */}
      <Modal
        isOpen={isApplyModalOpen}
        onClose={() => setIsApplyModalOpen(false)}
        title="Apply for Leave"
        subtitle="Automatic working days calculation (excluding weekends and public holidays)"
      >
        <form onSubmit={handleApplySubmit} className="space-y-4">
          {applyError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
              {applyError}
            </div>
          )}

          <div>
            <label className="text-[11px] font-semibold text-slate-700">Leave Type</label>
            <select
              value={applyForm.leaveType}
              onChange={(e) =>
                setApplyForm({
                  ...applyForm,
                  leaveType: e.target.value as any,
                })
              }
              className="w-full text-xs px-3 py-2 rounded-xl border border-slate-border bg-white mt-1 capitalize"
            >
              <option value="annual">Annual Leave ({balances.annual} days left)</option>
              <option value="sick">Sick Leave ({balances.sick} days left)</option>
              <option value="casual">Casual Leave ({balances.casual} days left)</option>
              <option value="unpaid">Unpaid Leave (Unlimited, salary deducted)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-700">Start Date</label>
              <input
                type="date"
                required
                value={applyForm.startDate}
                onChange={(e) => setApplyForm({ ...applyForm, startDate: e.target.value })}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-border mt-1"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-700">End Date</label>
              <input
                type="date"
                required
                value={applyForm.endDate}
                onChange={(e) => setApplyForm({ ...applyForm, endDate: e.target.value })}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-border mt-1"
              />
            </div>
          </div>

          {/* Working Days Calculated Preview */}
          <div className="p-3 bg-lavender-50 rounded-xl border border-indigo-200 flex items-center justify-between text-xs">
            <span className="font-semibold text-indigo-950">Calculated Working Days:</span>
            <span className="font-black text-primary text-sm">{calculatedDays} day(s)</span>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-700">Reason</label>
            <textarea
              required
              rows={3}
              value={applyForm.reason}
              onChange={(e) => setApplyForm({ ...applyForm, reason: e.target.value })}
              placeholder="Please provide the reason for your leave request..."
              className="w-full text-xs px-3 py-2 rounded-xl border border-slate-border mt-1"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsApplyModalOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || calculatedDays <= 0}
              className="px-5 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-semibold shadow-soft disabled:opacity-50"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Application'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Smart Leave AI Prompt Modal */}
      <Modal
        isOpen={isSmartLeaveModalOpen}
        onClose={() => setIsSmartLeaveModalOpen(false)}
        title="Smart Leave with AI"
        subtitle="Type your request in plain English or Roman Urdu, and AI will pre-fill the form"
      >
        <form onSubmit={handleSmartLeaveParse} className="space-y-4">
          <div className="p-3 bg-lavender-50 rounded-xl border border-indigo-200 text-xs text-indigo-900 space-y-1">
            <span className="font-bold flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-primary" /> Examples you can type:
            </span>
            <p className="italic text-slate-600">"Need next Monday and Tuesday off for sister's wedding"</p>
            <p className="italic text-slate-600">"Doctor appointment tomorrow for severe migraine"</p>
            <p className="italic text-slate-600">"Mujhe aglay peer aur mangal ko chutti chahiye bhai ki shadi k liye"</p>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-700">Your Leave Request</label>
            <textarea
              required
              rows={3}
              value={smartPrompt}
              onChange={(e) => setSmartPrompt(e.target.value)}
              placeholder="Type your leave request in plain words..."
              className="w-full text-xs px-3 py-2 rounded-xl border border-slate-border mt-1"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsSmartLeaveModalOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isParsingSmart || !smartPrompt.trim()}
              className="px-5 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-soft disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              {isParsingSmart ? 'Parsing Request...' : 'Generate Pre-filled Form'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Review Modal (Manager) */}
      {selectedRequestToReview && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedRequestToReview(null)}
          title={`Review Leave Request (${reviewAction.toUpperCase()})`}
          subtitle={`Employee: ${selectedRequestToReview.employeeId?.firstName} ${selectedRequestToReview.employeeId?.lastName}`}
        >
          <div className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
              <div>
                <span className="font-semibold">Type:</span>{' '}
                <span className="capitalize">{selectedRequestToReview.leaveType}</span> (
                {selectedRequestToReview.workingDays} working days)
              </div>
              <div>
                <span className="font-semibold">Duration:</span> {selectedRequestToReview.startDate} to{' '}
                {selectedRequestToReview.endDate}
              </div>
              <div>
                <span className="font-semibold">Reason:</span> "{selectedRequestToReview.reason}"
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                Decision Comment (Optional)
              </label>
              <textarea
                rows={3}
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Add a remark for the employee..."
                className="w-full text-xs p-3 rounded-xl border border-slate-border"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedRequestToReview(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleReviewSubmit}
                className={`px-5 py-2 text-white rounded-xl text-xs font-semibold shadow-soft ${
                  reviewAction === 'approved'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                Confirm {reviewAction === 'approved' ? 'Approval' : 'Rejection'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
