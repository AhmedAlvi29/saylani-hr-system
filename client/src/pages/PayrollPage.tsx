import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiRequest, downloadPayslipPdf } from '../services/api';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import {
  Receipt,
  Download,
  Lock,
  Sparkles,
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Calendar,
  FileCheck,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const PayrollPage: React.FC = () => {
  const { user } = useAuth();
  const role = user?.role || 'employee';
  const isManager = role === 'admin' || role === 'hr';
  const isAdmin = role === 'admin';

  const currentMonthStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);

  const [runData, setRunData] = useState<any>(null);
  const [payslips, setPayslips] = useState<any[]>([]);
  const [myPayslips, setMyPayslips] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isFinalizing, setIsFinalizing] = useState<boolean>(false);
  const [isLockModalOpen, setIsLockModalOpen] = useState<boolean>(false);

  const fetchPayroll = async () => {
    setIsLoading(true);
    try {
      if (isManager) {
        try {
          const res = await apiRequest(`/payroll/runs/${selectedMonth}`);
          setRunData(res.run);
          setPayslips(res.payslips || []);
        } catch (err: any) {
          // If 404, payroll not yet generated for this month
          setRunData(null);
          setPayslips([]);
        }
      } else {
        const myData = await apiRequest('/payroll/my-payslips');
        setMyPayslips(myData || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPayroll();
  }, [selectedMonth]);

  // HR generates draft
  const handleGenerateDraft = async () => {
    setIsGenerating(true);
    try {
      await apiRequest('/payroll/draft', {
        method: 'POST',
        body: JSON.stringify({ month: selectedMonth }),
      });
      await fetchPayroll();
    } catch (err: any) {
      alert(err.message || 'Failed to generate draft.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Admin finalizes and permanently locks payroll
  const handleFinalizePayroll = async () => {
    setIsFinalizing(true);
    try {
      await apiRequest(`/payroll/runs/${selectedMonth}/finalize`, {
        method: 'POST',
      });

      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
      });

      setIsLockModalOpen(false);
      await fetchPayroll();
    } catch (err: any) {
      alert(err.message || 'Failed to finalize payroll.');
    } finally {
      setIsFinalizing(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-main">
            {isManager ? 'Payroll Lite Management' : 'My Payslips'}
          </h1>
          <p className="text-xs text-slate-muted">
            Salary generation, challenge tax slabs, deduction breakdown, and PDF payslips
          </p>
        </div>

        {isManager && (
          <div className="flex items-center gap-2">
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="text-xs px-3 py-2 rounded-xl border border-slate-border bg-white font-semibold text-slate-700"
            />

            {/* HR Draft Button */}
            {(!runData || runData.status === 'draft') && (
              <button
                onClick={handleGenerateDraft}
                disabled={isGenerating}
                className="px-4 py-2 bg-lavender-100 hover:bg-lavender-200 text-primary border border-indigo-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-soft disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                {isGenerating ? 'Calculating...' : runData ? 'Re-calculate Draft' : 'Generate Draft'}
              </button>
            )}

            {/* Admin Finalize & Lock Button */}
            {isAdmin && runData && runData.status === 'draft' && (
              <button
                onClick={() => setIsLockModalOpen(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-soft transition-all"
              >
                <Lock className="w-4 h-4" /> Finalize & Lock Payroll
              </button>
            )}
          </div>
        )}
      </div>

      {/* Manager Summary View */}
      {isManager && runData && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <Card className="p-3 text-center">
            <span className="text-[11px] font-semibold text-slate-400">Total Gross</span>
            <div className="text-lg font-black text-slate-main mt-0.5">
              PKR {(runData.totalGross || 0).toLocaleString()}
            </div>
          </Card>
          <Card className="p-3 text-center">
            <span className="text-[11px] font-semibold text-rose-500">Total Deductions</span>
            <div className="text-lg font-black text-rose-700 mt-0.5">
              - PKR {(runData.totalDeductions || 0).toLocaleString()}
            </div>
          </Card>
          <Card className="p-3 text-center">
            <span className="text-[11px] font-semibold text-amber-600">Total Income Tax</span>
            <div className="text-lg font-black text-amber-700 mt-0.5">
              - PKR {(runData.totalTax || 0).toLocaleString()}
            </div>
          </Card>
          <Card className="p-3 text-center bg-emerald-50/50 border-emerald-100">
            <span className="text-[11px] font-semibold text-emerald-800">Total Net Payout</span>
            <div className="text-lg font-black text-emerald-900 mt-0.5">
              PKR {(runData.totalNet || 0).toLocaleString()}
            </div>
          </Card>
          <Card className="p-3 text-center">
            <span className="text-[11px] font-semibold text-slate-400">Status</span>
            <div className="mt-1">
              <Badge status={runData.status} />
            </div>
          </Card>
        </div>
      )}

      {/* Payslips Table for Managers */}
      {isManager && (
        <Card
          title={`Payroll Breakdown — ${selectedMonth}`}
          subtitle={
            runData?.status === 'finalized'
              ? 'Payroll is locked. All official payslips published to employees.'
              : 'Review draft calculations before Admin locking.'
          }
        >
          <div className="overflow-x-auto mt-2">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="pb-3 px-3">Employee</th>
                  <th className="pb-3 px-3">Basic</th>
                  <th className="pb-3 px-3">HRA + Med</th>
                  <th className="pb-3 px-3">Gross</th>
                  <th className="pb-3 px-3">Att / Days</th>
                  <th className="pb-3 px-3 text-rose-600">Deductions</th>
                  <th className="pb-3 px-3 text-amber-600">Tax</th>
                  <th className="pb-3 px-3 font-bold text-slate-main">Net Salary</th>
                  <th className="pb-3 px-3 text-right">Payslip PDF</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {payslips.length > 0 ? (
                  payslips.map((slip) => {
                    const emp = slip.employeeId;
                    return (
                      <tr key={slip._id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-3 font-medium text-slate-main">
                          <div>
                            {emp?.firstName} {emp?.lastName}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">{emp?.employeeCode}</div>
                        </td>
                        <td className="py-3 px-3 text-slate-600">
                          {slip.basicSalary?.toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-slate-500">
                          {(slip.hra + slip.medicalAllowance)?.toLocaleString()}
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-700">
                          {slip.proratedGross?.toLocaleString()}
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-semibold text-slate-700">{slip.presentDays}</span>
                          <span className="text-slate-400 text-[10px]"> / {slip.workingDays}d</span>
                        </td>
                        <td className="py-3 px-3 text-rose-600 font-medium">
                          {slip.totalDeductions > 0 ? `-${slip.totalDeductions.toLocaleString()}` : '-'}
                        </td>
                        <td className="py-3 px-3 text-amber-700 font-medium">
                          {slip.monthlyTax > 0 ? `-${slip.monthlyTax.toLocaleString()}` : '0'}
                        </td>
                        <td className="py-3 px-3 font-black text-emerald-800 text-sm">
                          PKR {slip.netSalary?.toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() =>
                              downloadPayslipPdf(slip._id, `Payslip_${emp?.employeeCode}_${slip.month}.pdf`)
                            }
                            className="p-1.5 bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 rounded-lg transition-colors"
                            title="Download Official PDF Payslip"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      No payroll generated for {selectedMonth} yet. Click "Generate Draft" to compute.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Employee View: My Payslips */}
      {!isManager && (
        <Card title="My Official Payslips" subtitle="Download and view verified salary records">
          <div className="overflow-x-auto mt-2">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="pb-3 px-3">Pay Period</th>
                  <th className="pb-3 px-3">Gross Salary</th>
                  <th className="pb-3 px-3 text-rose-600">Total Deductions</th>
                  <th className="pb-3 px-3 text-amber-600">Income Tax</th>
                  <th className="pb-3 px-3 font-bold text-slate-main">Net Payable</th>
                  <th className="pb-3 px-3">Status</th>
                  <th className="pb-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {myPayslips.length > 0 ? (
                  myPayslips.map((slip) => (
                    <tr key={slip._id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-3 font-bold text-slate-main font-mono">{slip.month}</td>
                      <td className="py-3 px-3 font-semibold text-slate-700">
                        PKR {slip.grossSalary?.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-rose-600 font-medium">
                        - PKR {slip.totalDeductions?.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-amber-700 font-medium">
                        - PKR {slip.monthlyTax?.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 font-black text-emerald-800 text-sm">
                        PKR {slip.netSalary?.toLocaleString()}
                      </td>
                      <td className="py-3 px-3">
                        <Badge status={slip.isLocked ? 'finalized' : 'draft'} />
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => downloadPayslipPdf(slip._id, `My_Payslip_${slip.month}.pdf`)}
                          className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 ml-auto transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" /> PDF
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      No published payslips available yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Admin Finalize Confirmation Modal */}
      <Modal
        isOpen={isLockModalOpen}
        onClose={() => setIsLockModalOpen(false)}
        title="Finalize & Lock Monthly Payroll"
        subtitle={`Permanently locks payroll for ${selectedMonth}`}
      >
        <div className="space-y-4">
          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-950">
              <AlertCircle className="w-4 h-4 text-amber-600" /> Important Governance Check
            </div>
            <p>
              Finalizing payroll for <strong>{selectedMonth}</strong> will:
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-700">
              <li>Permanently lock all employee payslips for this period.</li>
              <li>Make payslips instantly downloadable by employees in their portal.</li>
              <li>Log an immutable audit entry in the company audit trail.</li>
              <li>Prevent any further salary recalculations for {selectedMonth}.</li>
            </ul>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setIsLockModalOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={handleFinalizePayroll}
              disabled={isFinalizing}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-soft flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              {isFinalizing ? 'Finalizing...' : 'Yes, Finalize & Lock Payroll'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
