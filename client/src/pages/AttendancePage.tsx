import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../services/api';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import {
  CalendarCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  Camera,
  Calendar,
  Filter,
  ArrowRight,
  Send,
  Check,
  X,
} from 'lucide-react';

export const AttendancePage: React.FC = () => {
  const { user } = useAuth();
  const role = user?.role || 'employee';
  const isManager = role === 'admin' || role === 'hr';

  // Board Data
  const [boardData, setBoardData] = useState<any>(null);
  const [targetDate, setTargetDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [selectedDept, setSelectedDept] = useState<string>('');
  const [departments, setDepartments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Correction Requests
  const [corrections, setCorrections] = useState<any[]>([]);
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState<boolean>(false);
  const [correctionForm, setCorrectionForm] = useState({
    date: new Date().toISOString().split('T')[0],
    requestedCheckIn: '09:00',
    requestedCheckOut: '17:00',
    reason: '',
  });
  const [isSubmittingCorrection, setIsSubmittingCorrection] = useState<boolean>(false);

  // Review comment modal
  const [selectedCorrectionToReview, setSelectedCorrectionToReview] = useState<any>(null);
  const [reviewAction, setReviewAction] = useState<'approved' | 'rejected'>('approved');
  const [reviewComment, setReviewComment] = useState<string>('');

  const fetchBoard = async () => {
    setIsLoading(true);
    try {
      if (isManager) {
        const query = new URLSearchParams();
        query.append('date', targetDate);
        if (selectedDept) query.append('departmentId', selectedDept);

        const data = await apiRequest(`/attendance/board?${query.toString()}`);
        setBoardData(data);
      } else {
        // Employee attendance history
        const records = await apiRequest(`/attendance/history`);
        setBoardData({ records });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPendingCorrections = async () => {
    if (!isManager) return;
    try {
      const data = await apiRequest('/attendance/corrections');
      setCorrections(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchDepts = async () => {
    try {
      const depts = await apiRequest('/org/departments');
      setDepartments(depts || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchDepts();
  }, []);

  useEffect(() => {
    fetchBoard();
    if (isManager) fetchPendingCorrections();
  }, [targetDate, selectedDept]);

  // Submit Correction Request (Employee)
  const handleCorrectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingCorrection(true);
    try {
      const reqIn = `${correctionForm.date}T${correctionForm.requestedCheckIn}:00`;
      const reqOut = `${correctionForm.date}T${correctionForm.requestedCheckOut}:00`;

      await apiRequest('/attendance/correction', {
        method: 'POST',
        body: JSON.stringify({
          date: correctionForm.date,
          requestedCheckIn: reqIn,
          requestedCheckOut: reqOut,
          reason: correctionForm.reason,
        }),
      });

      alert('Attendance correction submitted for HR approval.');
      setIsCorrectionModalOpen(false);
      setCorrectionForm({
        date: new Date().toISOString().split('T')[0],
        requestedCheckIn: '09:00',
        requestedCheckOut: '17:00',
        reason: '',
      });
      fetchBoard();
    } catch (err: any) {
      alert(err.message || 'Failed to submit correction');
    } finally {
      setIsSubmittingCorrection(false);
    }
  };

  // Review Correction (Manager)
  const handleReviewCorrectionSubmit = async () => {
    if (!selectedCorrectionToReview) return;
    try {
      await apiRequest(`/attendance/corrections/${selectedCorrectionToReview._id}/review`, {
        method: 'POST',
        body: JSON.stringify({
          action: reviewAction,
          comment: reviewComment,
        }),
      });

      setSelectedCorrectionToReview(null);
      setReviewComment('');
      fetchPendingCorrections();
      fetchBoard();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-main">
            {isManager ? 'Daily Attendance Board' : 'My Attendance Record'}
          </h1>
          <p className="text-xs text-slate-muted">
            Real-time server check-ins, late arrival tracking, and correction review
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!isManager && (
            <button
              onClick={() => setIsCorrectionModalOpen(true)}
              className="px-4 py-2 bg-lavender-100 hover:bg-lavender-200 text-primary border border-indigo-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-soft"
            >
              <Clock className="w-4 h-4" /> Request Attendance Correction
            </button>
          )}
        </div>
      </div>

      {/* Manager Summary Counters */}
      {isManager && boardData && (
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
          <Card className="p-3 text-center">
            <span className="text-[11px] font-semibold text-slate-400">Total Staff</span>
            <div className="text-xl font-black text-slate-main mt-0.5">{boardData.totalEmployees || 0}</div>
          </Card>
          <Card className="p-3 text-center bg-emerald-50/50 border-emerald-100">
            <span className="text-[11px] font-semibold text-emerald-800">Present</span>
            <div className="text-xl font-black text-emerald-700 mt-0.5">{boardData.presentCount || 0}</div>
          </Card>
          <Card className="p-3 text-center bg-amber-50/50 border-amber-100">
            <span className="text-[11px] font-semibold text-amber-800">Late (&gt;9:15)</span>
            <div className="text-xl font-black text-amber-700 mt-0.5">{boardData.lateCount || 0}</div>
          </Card>
          <Card className="p-3 text-center bg-indigo-50/50 border-indigo-100">
            <span className="text-[11px] font-semibold text-indigo-800">Half Day (&lt;5h)</span>
            <div className="text-xl font-black text-indigo-700 mt-0.5">{boardData.halfDayCount || 0}</div>
          </Card>
          <Card className="p-3 text-center bg-purple-50/50 border-purple-100">
            <span className="text-[11px] font-semibold text-purple-800">On Leave</span>
            <div className="text-xl font-black text-purple-700 mt-0.5">{boardData.onLeaveCount || 0}</div>
          </Card>
          <Card className="p-3 text-center bg-rose-50/50 border-rose-100">
            <span className="text-[11px] font-semibold text-rose-800">Absent</span>
            <div className="text-xl font-black text-rose-700 mt-0.5">{boardData.absentCount || 0}</div>
          </Card>
        </div>
      )}

      {/* Date & Dept Filter Bar (Managers) */}
      {isManager && (
        <Card className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div>
                <label className="text-[10px] font-semibold text-slate-400 block mb-0.5">Select Date</label>
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="text-xs px-3 py-1.5 rounded-xl border border-slate-border bg-white text-slate-700"
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-slate-400 block mb-0.5">Department</label>
                <select
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  className="text-xs px-3 py-1.5 rounded-xl border border-slate-border bg-white text-slate-700"
                >
                  <option value="">All Departments</option>
                  {departments.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <span className="text-xs text-slate-400">
              Showing official daily records for {targetDate}
            </span>
          </div>
        </Card>
      )}

      {/* Pending Attendance Corrections Queue (Manager View) */}
      {isManager && corrections.length > 0 && (
        <div className="p-4 bg-amber-50/80 rounded-2xl border border-amber-200 space-y-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
              Pending Attendance Corrections ({corrections.length})
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {corrections.map((corr) => (
              <div key={corr._id} className="p-3 bg-white rounded-xl border border-amber-200 text-xs space-y-1.5">
                <div className="flex items-center justify-between font-semibold">
                  <span>
                    {corr.employeeId?.firstName} {corr.employeeId?.lastName} ({corr.employeeId?.employeeCode})
                  </span>
                  <Badge status="pending" />
                </div>
                <div className="text-slate-600">
                  <span className="font-semibold">Date:</span> {corr.date} |{' '}
                  <span className="font-semibold">Reason:</span> "{corr.correction?.reason}"
                </div>
                <div className="flex justify-end gap-1.5 pt-1">
                  <button
                    onClick={() => {
                      setSelectedCorrectionToReview(corr);
                      setReviewAction('rejected');
                    }}
                    className="px-2.5 py-1 bg-rose-50 text-rose-700 rounded-lg text-xs font-semibold hover:bg-rose-100 flex items-center gap-1"
                  >
                    <X className="w-3.5 h-3.5" /> Reject
                  </button>
                  <button
                    onClick={() => {
                      setSelectedCorrectionToReview(corr);
                      setReviewAction('approved');
                    }}
                    className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-semibold hover:bg-emerald-100 flex items-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" /> Approve
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Attendance Board Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                {isManager && <th className="pb-3 px-3">Employee</th>}
                <th className="pb-3 px-3">Date</th>
                <th className="pb-3 px-3">Check In</th>
                <th className="pb-3 px-3">Check Out</th>
                <th className="pb-3 px-3">Hours</th>
                <th className="pb-3 px-3">Late Mins</th>
                <th className="pb-3 px-3">Source</th>
                <th className="pb-3 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isManager && boardData?.records?.length > 0 ? (
                boardData.records.map((item: any, idx: number) => {
                  const emp = item.employee;
                  const att = item.attendance;
                  return (
                    <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-3 font-medium text-slate-main">
                        <div>
                          {emp?.firstName} {emp?.lastName}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {emp?.employeeCode} ({emp?.departmentId?.name})
                        </div>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-600">{boardData.date}</td>
                      <td className="py-3 px-3 text-slate-700">
                        {att?.checkInTime
                          ? new Date(att.checkInTime).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '-'}
                      </td>
                      <td className="py-3 px-3 text-slate-700">
                        {att?.checkOutTime
                          ? new Date(att.checkOutTime).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '-'}
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-main">
                        {att?.workingHours ? `${att.workingHours}h` : '0h'}
                      </td>
                      <td className="py-3 px-3">
                        {att?.isLate ? (
                          <span className="text-amber-600 font-semibold">+{att.lateMinutes}m</span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="py-3 px-3 capitalize text-slate-500">
                        {att?.checkInSource || '-'}
                      </td>
                      <td className="py-3 px-3">
                        <Badge status={item.computedStatus} />
                      </td>
                    </tr>
                  );
                })
              ) : !isManager && boardData?.records?.length > 0 ? (
                boardData.records.map((att: any) => (
                  <tr key={att._id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-3 font-mono font-medium text-slate-main">{att.date}</td>
                    <td className="py-3 px-3 text-slate-700">
                      {att.checkInTime
                        ? new Date(att.checkInTime).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '-'}
                    </td>
                    <td className="py-3 px-3 text-slate-700">
                      {att.checkOutTime
                        ? new Date(att.checkOutTime).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '-'}
                    </td>
                    <td className="py-3 px-3 font-semibold">{att.workingHours}h</td>
                    <td className="py-3 px-3 text-amber-600">
                      {att.isLate ? `+${att.lateMinutes} mins` : '-'}
                    </td>
                    <td className="py-3 px-3 capitalize">{att.checkInSource}</td>
                    <td className="py-3 px-3">
                      <Badge status={att.status} />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No attendance records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Attendance Correction Request Modal (Employee) */}
      <Modal
        isOpen={isCorrectionModalOpen}
        onClose={() => setIsCorrectionModalOpen(false)}
        title="Request Attendance Correction"
        subtitle="Submit missed check-in or actual hours for HR approval"
      >
        <form onSubmit={handleCorrectionSubmit} className="space-y-4">
          <div>
            <label className="text-[11px] font-semibold text-slate-700">Date of Attendance</label>
            <input
              type="date"
              required
              value={correctionForm.date}
              onChange={(e) => setCorrectionForm({ ...correctionForm, date: e.target.value })}
              className="w-full text-xs px-3 py-2 rounded-xl border border-slate-border mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-700">Actual Check In</label>
              <input
                type="time"
                required
                value={correctionForm.requestedCheckIn}
                onChange={(e) =>
                  setCorrectionForm({ ...correctionForm, requestedCheckIn: e.target.value })
                }
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-border mt-1"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-700">Actual Check Out</label>
              <input
                type="time"
                required
                value={correctionForm.requestedCheckOut}
                onChange={(e) =>
                  setCorrectionForm({ ...correctionForm, requestedCheckOut: e.target.value })
                }
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-border mt-1"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-700">Reason for Correction</label>
            <textarea
              required
              rows={3}
              value={correctionForm.reason}
              onChange={(e) => setCorrectionForm({ ...correctionForm, reason: e.target.value })}
              placeholder="e.g. Forgot to tap web check-out before leaving office..."
              className="w-full text-xs px-3 py-2 rounded-xl border border-slate-border mt-1"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsCorrectionModalOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingCorrection}
              className="px-5 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-semibold shadow-soft disabled:opacity-50"
            >
              {isSubmittingCorrection ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Review Correction Comment Modal (Manager) */}
      {selectedCorrectionToReview && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedCorrectionToReview(null)}
          title={`Review Attendance Correction (${reviewAction.toUpperCase()})`}
          subtitle={`Employee: ${selectedCorrectionToReview.employeeId?.firstName} ${selectedCorrectionToReview.employeeId?.lastName} | Date: ${selectedCorrectionToReview.date}`}
        >
          <div className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <span className="font-semibold text-slate-500">Employee Reason:</span>
              <p className="text-slate-800 mt-1 font-medium">"{selectedCorrectionToReview.correction?.reason}"</p>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                Reviewer Comment (Optional)
              </label>
              <textarea
                rows={3}
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Add any feedback or audit notes..."
                className="w-full text-xs p-3 rounded-xl border border-slate-border"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedCorrectionToReview(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleReviewCorrectionSubmit}
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
