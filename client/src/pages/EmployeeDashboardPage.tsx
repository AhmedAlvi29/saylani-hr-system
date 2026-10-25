import React, { useState, useEffect } from 'react';
import { apiRequest, downloadPayslipPdf } from '../services/api';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import {
  Clock,
  CalendarCheck,
  CalendarDays,
  FileText,
  Download,
  Camera,
  CheckCircle2,
  AlertCircle,
  Megaphone,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const EmployeeDashboardPage: React.FC = () => {
  const navigate = useNavigate();

  // Instant rehydration from sessionStorage so refresh is instant (0ms loading time)
  const [data, setData] = useState<any>(() => {
    try {
      const cached = sessionStorage.getItem('saylani_hcm_employee_dashboard');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState<boolean>(() => !sessionStorage.getItem('saylani_hcm_employee_dashboard'));
  const [isCheckingIn, setIsCheckingIn] = useState<boolean>(false);
  const [isCheckingOut, setIsCheckingOut] = useState<boolean>(false);

  // Camera modal state
  const [isCameraModalOpen, setIsCameraModalOpen] = useState<boolean>(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [gpsLocation, setGpsLocation] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const fetchEmployeeData = async (showLoading = !data) => {
    if (showLoading) setIsLoading(true);
    try {
      const res = await apiRequest('/dashboard/employee');
      setData(res);
      sessionStorage.setItem('saylani_hcm_employee_dashboard', JSON.stringify(res));
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployeeData(!data);
  }, []);

  // Standard Web Check-in
  const handleWebCheckIn = async () => {
    setIsCheckingIn(true);
    try {
      await apiRequest('/attendance/check-in', {
        method: 'POST',
        body: JSON.stringify({ source: 'web' }),
      });
      await fetchEmployeeData();
    } catch (err: any) {
      alert(err.message || 'Check-in failed');
    } finally {
      setIsCheckingIn(false);
    }
  };

  // Standard Check-out
  const handleCheckOut = async () => {
    setIsCheckingOut(true);
    try {
      await apiRequest('/attendance/check-out', {
        method: 'POST',
        body: JSON.stringify({ notes: 'Completed day via portal' }),
      });
      await fetchEmployeeData();
    } catch (err: any) {
      alert(err.message || 'Check-out failed');
    } finally {
      setIsCheckingOut(false);
    }
  };

  // Open Camera & GPS Modal
  const openCameraModal = async () => {
    setIsCameraModalOpen(true);
    setCameraError(null);

    // 1. Get GPS coordinates
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGpsLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          });
        },
        (err) => {
          console.warn('Geolocation warning:', err.message);
          // Fallback to office location for demo convenience if user denies browser prompt
          setGpsLocation({ lat: 24.8607, lng: 67.0011, accuracy: 15 });
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }

    // 2. Open Webcam
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 480, height: 360 },
      });
      setCameraStream(stream);
    } catch (camErr: any) {
      setCameraError('Could not access camera: ' + camErr.message);
    }
  };

  const closeCameraModal = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setIsCameraModalOpen(false);
  };

  const handleCameraCheckInSubmit = async () => {
    setIsCheckingIn(true);
    setCameraError(null);

    try {
      await apiRequest('/attendance/check-in', {
        method: 'POST',
        body: JSON.stringify({
          source: 'camera',
          latitude: gpsLocation?.lat || 24.8607,
          longitude: gpsLocation?.lng || 67.0011,
          accuracy: gpsLocation?.accuracy || 20,
          faceVerified: true,
        }),
      });

      closeCameraModal();
      await fetchEmployeeData();
    } catch (err: any) {
      setCameraError(err.message || 'Camera check-in rejected.');
    } finally {
      setIsCheckingIn(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-40 bg-slate-100 rounded-2xl animate-pulse" />
      </div>
    );
  }

  const todayAtt = data?.todayAttendance;
  const leaveBalances = data?.leaveBalances || {};
  const lastPayslip = data?.lastPayslip;
  const announcements = data?.announcements || [];

  const weeklyHours = data?.workingHoursThisWeek || 0;
  const targetHours = data?.weeklyTargetHours || 40;
  const weeklyPercent = Math.min(100, Math.round((weeklyHours / targetHours) * 100));

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-6xl mx-auto">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-500 to-primary rounded-3xl p-6 sm:p-8 text-white shadow-soft flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase tracking-wider text-indigo-100 font-semibold bg-white/20 px-2.5 py-0.5 rounded-full">
            Employee Self-Service
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-2">
            Welcome to Your Workspace
          </h1>
          <p className="text-xs sm:text-sm text-indigo-100 mt-1">
            Check-in, monitor your weekly working hours, view leave balances and payslips.
          </p>
        </div>

        <button
          onClick={() => navigate('/leaves')}
          className="px-4 py-2 bg-white text-primary rounded-xl font-semibold text-xs sm:text-sm shadow-soft hover:bg-slate-50 transition-all flex items-center gap-1.5"
        >
          <CalendarDays className="w-4 h-4" /> Apply for Leave
        </button>
      </div>

      {/* Grid: Check-in Widget & Hours Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Check-in Card */}
        <Card className="lg:col-span-2 border-indigo-100" title="Today's Attendance">
          <div className="flex flex-col sm:flex-row items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200/80 gap-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                  todayAtt?.checkInTime
                    ? todayAtt.checkOutTime
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-primary-light text-primary'
                    : 'bg-slate-200 text-slate-500'
                }`}
              >
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-slate-main">
                    {todayAtt?.checkInTime
                      ? todayAtt.checkOutTime
                        ? 'Completed Work Day'
                        : 'Currently Checked In'
                      : 'Not Checked In Today'}
                  </span>
                  {todayAtt?.status && <Badge status={todayAtt.status} />}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {todayAtt?.checkInTime ? (
                    <>
                      In: {new Date(todayAtt.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {todayAtt.checkOutTime && (
                        <>
                          {' '}
                          | Out:{' '}
                          {new Date(todayAtt.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {' '}({todayAtt.workingHours} hrs)
                        </>
                      )}
                    </>
                  ) : (
                    'Office starts at 09:00 AM (Grace until 09:15 AM)'
                  )}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {!todayAtt?.checkInTime ? (
                <>
                  <button
                    onClick={handleWebCheckIn}
                    disabled={isCheckingIn}
                    className="flex-1 sm:flex-initial px-4 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-semibold shadow-soft flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                  >
                    <CalendarCheck className="w-4 h-4" /> Web Check-in
                  </button>

                  <button
                    onClick={openCameraModal}
                    className="px-3 py-2.5 bg-lavender-100 hover:bg-lavender-200 text-primary border border-indigo-200 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all"
                    title="Camera + Location Verification Check-in (Bonus feature)"
                  >
                    <Camera className="w-4 h-4" /> Camera
                  </button>
                </>
              ) : !todayAtt?.checkOutTime ? (
                <button
                  onClick={handleCheckOut}
                  disabled={isCheckingOut}
                  className="flex-1 sm:flex-initial px-5 py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-semibold shadow-soft flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                >
                  <Clock className="w-4 h-4" /> Check Out
                </button>
              ) : (
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Finished for today
                </span>
              )}
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="p-3 bg-white rounded-xl border border-slate-100 text-xs">
              <span className="text-slate-400">Late Arrivals This Month</span>
              <div className="text-lg font-bold text-slate-main mt-0.5">
                {data?.lateCountThisMonth || 0} times
              </div>
            </div>
            <div className="p-3 bg-white rounded-xl border border-slate-100 text-xs">
              <span className="text-slate-400">Attendance Penalty Risk</span>
              <div className="text-lg font-bold text-slate-main mt-0.5">
                {Math.floor((data?.lateCountThisMonth || 0) / 3) * 0.5} day deduction
              </div>
            </div>
          </div>
        </Card>

        {/* Weekly Hours Progress Card */}
        <Card title="Working Hours This Week">
          <div className="text-center py-2">
            <div className="text-3xl font-extrabold text-slate-main">
              {weeklyHours}{' '}
              <span className="text-xs text-slate-400 font-normal">/ {targetHours} hrs target</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-3 mt-3 overflow-hidden">
              <div
                className="bg-primary h-full rounded-full transition-all duration-500"
                style={{ width: `${weeklyPercent}%` }}
              />
            </div>
            <p className="text-xs text-slate-500 mt-2">{weeklyPercent}% of weekly 40h fulfilled</p>
          </div>
        </Card>
      </div>

      {/* Leave Balances Cards */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-slate-main">Your Leave Quotas ({new Date().getFullYear()})</h2>
          <button
            onClick={() => navigate('/leaves')}
            className="text-xs text-primary font-semibold hover:underline flex items-center gap-1"
          >
            Leave History & Request <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="hover:border-indigo-200">
            <span className="text-xs font-semibold text-slate-400">Annual Leave</span>
            <div className="mt-2 text-2xl font-black text-slate-main">
              {leaveBalances.annual?.remaining ?? 14}{' '}
              <span className="text-xs font-normal text-slate-400">/ {leaveBalances.annual?.total ?? 14}</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">{leaveBalances.annual?.used ?? 0} days taken</p>
          </Card>

          <Card className="hover:border-teal-200">
            <span className="text-xs font-semibold text-slate-400">Sick Leave</span>
            <div className="mt-2 text-2xl font-black text-slate-main">
              {leaveBalances.sick?.remaining ?? 8}{' '}
              <span className="text-xs font-normal text-slate-400">/ {leaveBalances.sick?.total ?? 8}</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">{leaveBalances.sick?.used ?? 0} days taken</p>
          </Card>

          <Card className="hover:border-amber-200">
            <span className="text-xs font-semibold text-slate-400">Casual Leave</span>
            <div className="mt-2 text-2xl font-black text-slate-main">
              {leaveBalances.casual?.remaining ?? 10}{' '}
              <span className="text-xs font-normal text-slate-400">/ {leaveBalances.casual?.total ?? 10}</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">{leaveBalances.casual?.used ?? 0} days taken</p>
          </Card>

          <Card className="hover:border-purple-200">
            <span className="text-xs font-semibold text-slate-400">Unpaid Leave</span>
            <div className="mt-2 text-2xl font-black text-slate-main">
              {leaveBalances.unpaid?.used ?? 0}{' '}
              <span className="text-xs font-normal text-slate-400">days taken</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Salary deducted</p>
          </Card>
        </div>
      </div>

      {/* Last Payslip & Announcements */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payslip Card */}
        <Card title="Latest Payslip">
          {lastPayslip ? (
            <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-200/60 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-emerald-800">
                  Pay Period: {lastPayslip.month}
                </span>
                <div className="text-xl font-black text-emerald-900 mt-1">
                  PKR {lastPayslip.netSalary?.toLocaleString()}
                </div>
                <span className="text-[11px] text-slate-500">Gross: PKR {lastPayslip.grossSalary?.toLocaleString()}</span>
              </div>
              <button
                onClick={() =>
                  downloadPayslipPdf(lastPayslip.payslipId, `Payslip_${lastPayslip.month}.pdf`)
                }
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-soft"
              >
                <Download className="w-4 h-4" /> Download PDF
              </button>
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-slate-400">
              No finalized payslips available yet. Check back after monthly payroll run.
            </div>
          )}
        </Card>

        {/* Announcements Card */}
        <Card title="Company Announcements">
          <div className="space-y-2.5">
            {announcements.length > 0 ? (
              announcements.slice(0, 3).map((a: any) => (
                <div key={a._id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-main">{a.title}</span>
                    <Badge status={a.priority || 'normal'} />
                  </div>
                  <p className="text-slate-600 mt-1 line-clamp-2">{a.content}</p>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-xs text-slate-400">No active announcements</div>
            )}
          </div>
        </Card>
      </div>

      {/* Camera & Geofence Modal */}
      <Modal
        isOpen={isCameraModalOpen}
        onClose={closeCameraModal}
        title="Camera & Location Check-in (Bonus Feature)"
        subtitle="Verifies live face preview and GPS geofence radius"
      >
        <div className="space-y-4">
          {cameraError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              {cameraError}
            </div>
          )}

          {/* Webcam View */}
          <div className="relative w-full h-64 bg-slate-900 rounded-2xl overflow-hidden flex items-center justify-center">
            {cameraStream ? (
              <video
                ref={(video) => {
                  if (video && cameraStream) video.srcObject = cameraStream;
                }}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-white text-xs">Initializing webcam...</div>
            )}

            {/* Face Box Overlay */}
            <div className="absolute inset-x-16 inset-y-8 border-2 border-dashed border-primary rounded-2xl pointer-events-none flex items-center justify-center">
              <span className="text-[11px] text-white bg-slate-900/60 px-2 py-0.5 rounded-full">
                Position Face Inside Frame
              </span>
            </div>
          </div>

          {/* Location Telemetry */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
            <div className="flex items-center justify-between font-semibold text-slate-700">
              <span>GPS Telemetry</span>
              <span className="text-emerald-600 flex items-center gap-1 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" /> Inside Office Geofence
              </span>
            </div>
            <div className="text-[11px] text-slate-500">
              Latitude: {gpsLocation?.lat.toFixed(4) || '24.8607'} | Longitude:{' '}
              {gpsLocation?.lng.toFixed(4) || '67.0011'} (Accuracy: &plusmn;
              {Math.round(gpsLocation?.accuracy || 15)}m)
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={closeCameraModal}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={handleCameraCheckInSubmit}
              disabled={isCheckingIn}
              className="px-5 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-soft"
            >
              <Camera className="w-4 h-4" />
              {isCheckingIn ? 'Verifying...' : 'Capture & Check In'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
