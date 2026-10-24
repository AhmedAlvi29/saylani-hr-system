import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../services/api';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import {
  Building2,
  Clock,
  MapPin,
  Users,
  Calendar,
  Plus,
  Trash2,
  Lock,
  Save,
  CheckCircle2,
  AlertCircle,
  Shield,
} from 'lucide-react';

export const OrganizationSettingsPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [activeTab, setActiveTab] = useState<'timing' | 'depts' | 'holidays' | 'users'>('timing');

  // Settings State
  const [settings, setSettings] = useState<any>(null);
  const [departments, setDepartments] = useState<any[]>([]);
  const [designations, setDesignations] = useState<any[]>([]);
  const [holidays, setHolidays] = useState<any[]>([]);
  const [hrUsers, setHrUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Modals
  const [isAddDeptModal, setIsAddDeptModal] = useState<boolean>(false);
  const [newDept, setNewDept] = useState({ name: '', code: '', description: '' });

  const [isAddHolidayModal, setIsAddHolidayModal] = useState<boolean>(false);
  const [newHoliday, setNewHoliday] = useState({ name: '', date: '', description: '' });

  const [isAddHrUserModal, setIsAddHrUserModal] = useState<boolean>(false);
  const [newHrUser, setNewHrUser] = useState({ name: '', email: '', password: 'Hr@123456', role: 'hr' });

  const fetchAllSettings = async () => {
    setIsLoading(true);
    try {
      const [settingsRes, deptsRes, desigsRes, holidaysRes] = await Promise.all([
        apiRequest('/org/settings'),
        apiRequest('/org/departments'),
        apiRequest('/org/designations'),
        apiRequest('/org/holidays'),
      ]);

      setSettings(settingsRes);
      setDepartments(deptsRes || []);
      setDesignations(desigsRes || []);
      setHolidays(holidaysRes || []);

      if (isAdmin) {
        const usersRes = await apiRequest('/org/users');
        setHrUsers(usersRes || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllSettings();
  }, []);

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      await apiRequest('/org/settings', {
        method: 'PUT',
        body: JSON.stringify(settings),
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to update settings');
    } finally {
      setIsSaving(false);
    }
  };

  // Add Department
  const handleAddDeptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/org/departments', {
        method: 'POST',
        body: JSON.stringify(newDept),
      });
      setIsAddDeptModal(false);
      setNewDept({ name: '', code: '', description: '' });
      fetchAllSettings();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Add Holiday
  const handleAddHolidaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/org/holidays', {
        method: 'POST',
        body: JSON.stringify(newHoliday),
      });
      setIsAddHolidayModal(false);
      setNewHoliday({ name: '', date: '', description: '' });
      fetchAllSettings();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Add HR User
  const handleAddHrUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/org/users', {
        method: 'POST',
        body: JSON.stringify(newHrUser),
      });
      setIsAddHrUserModal(false);
      setNewHrUser({ name: '', email: '', password: 'Hr@123456', role: 'hr' });
      fetchAllSettings();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Toggle user active
  const handleToggleUser = async (id: string) => {
    try {
      await apiRequest(`/org/users/${id}/toggle`, { method: 'PATCH' });
      fetchAllSettings();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-main">Organization Setup & Settings</h1>
        <p className="text-xs text-slate-muted">
          Company timing rules, department hierarchy, public holidays, and HR access controls
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          onClick={() => setActiveTab('timing')}
          className={`pb-3 text-xs sm:text-sm font-semibold border-b-2 px-3 transition-colors ${
            activeTab === 'timing'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Work Schedule & Geofence
        </button>
        <button
          onClick={() => setActiveTab('depts')}
          className={`pb-3 text-xs sm:text-sm font-semibold border-b-2 px-3 transition-colors ${
            activeTab === 'depts'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Departments & Designations
        </button>
        <button
          onClick={() => setActiveTab('holidays')}
          className={`pb-3 text-xs sm:text-sm font-semibold border-b-2 px-3 transition-colors ${
            activeTab === 'holidays'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Public Holidays
        </button>
        {isAdmin && (
          <button
            onClick={() => setActiveTab('users')}
            className={`pb-3 text-xs sm:text-sm font-semibold border-b-2 px-3 transition-colors ${
              activeTab === 'users'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            HR Logins Management
          </button>
        )}
      </div>

      {/* Tab 1: Timing & Geofence */}
      {activeTab === 'timing' && settings && (
        <Card title="Timing & Geofence Policy" subtitle={isAdmin ? 'Configurable by Admin' : 'Read-only view'}>
          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-[11px] font-semibold text-slate-700">Office Start Time</label>
                <input
                  type="time"
                  disabled={!isAdmin}
                  value={settings.officeStartTime || '09:00'}
                  onChange={(e) => setSettings({ ...settings, officeStartTime: e.target.value })}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-border mt-1 disabled:bg-slate-50"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700">Grace Minutes</label>
                <input
                  type="number"
                  disabled={!isAdmin}
                  value={settings.graceMinutes ?? 15}
                  onChange={(e) =>
                    setSettings({ ...settings, graceMinutes: parseInt(e.target.value, 10) || 0 })
                  }
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-border mt-1 disabled:bg-slate-50"
                />
                <span className="text-[10px] text-slate-400">Late marked after 09:15</span>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700">Half Day Threshold (Hours)</label>
                <input
                  type="number"
                  disabled={!isAdmin}
                  value={settings.halfDayThresholdHours ?? 5}
                  onChange={(e) =>
                    setSettings({ ...settings, halfDayThresholdHours: parseInt(e.target.value, 10) || 5 })
                  }
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-border mt-1 disabled:bg-slate-50"
                />
                <span className="text-[10px] text-slate-400">&lt; 5 hours = Half Day status</span>
              </div>
            </div>

            {/* Geofence */}
            <div className="pt-2">
              <label className="text-xs font-bold text-slate-main block mb-1">
                Camera Attendance Geofence Location
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
                <div>
                  <label className="text-[10px] text-slate-400 font-semibold">Office Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    disabled={!isAdmin}
                    value={settings.officeLocation?.latitude ?? 24.8607}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        officeLocation: {
                          ...settings.officeLocation,
                          latitude: parseFloat(e.target.value) || 0,
                        },
                      })
                    }
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-border bg-white mt-1 disabled:bg-slate-50"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 font-semibold">Office Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    disabled={!isAdmin}
                    value={settings.officeLocation?.longitude ?? 67.0011}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        officeLocation: {
                          ...settings.officeLocation,
                          longitude: parseFloat(e.target.value) || 0,
                        },
                      })
                    }
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-border bg-white mt-1 disabled:bg-slate-50"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 font-semibold">Radius (Meters)</label>
                  <input
                    type="number"
                    disabled={!isAdmin}
                    value={settings.officeLocation?.radiusMeters ?? 150}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        officeLocation: {
                          ...settings.officeLocation,
                          radiusMeters: parseInt(e.target.value, 10) || 150,
                        },
                      })
                    }
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-border bg-white mt-1 disabled:bg-slate-50"
                  />
                </div>
              </div>
            </div>

            {isAdmin && (
              <div className="flex items-center justify-between pt-2">
                {saveSuccess && (
                  <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Settings saved successfully!
                  </span>
                )}
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-semibold shadow-soft flex items-center gap-1.5 ml-auto"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? 'Saving...' : 'Save Configuration'}
                </button>
              </div>
            )}
          </form>
        </Card>
      )}

      {/* Tab 2: Departments & Designations */}
      {activeTab === 'depts' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card
            title="Registered Departments"
            subtitle="Organizational functional units"
            action={
              isAdmin && (
                <button
                  onClick={() => setIsAddDeptModal(true)}
                  className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-semibold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              )
            }
          >
            <div className="space-y-2 mt-2">
              {departments.map((dept) => (
                <div
                  key={dept._id}
                  className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-bold text-slate-main">{dept.name}</span>
                    <span className="ml-2 font-mono text-[10px] bg-slate-200 px-1.5 py-0.5 rounded text-slate-700">
                      {dept.code}
                    </span>
                    <p className="text-[11px] text-slate-400 mt-0.5">{dept.description || 'No description'}</p>
                  </div>
                  <Badge status={dept.isActive ? 'active' : 'inactive'} />
                </div>
              ))}
            </div>
          </Card>

          <Card title="Designation Titles" subtitle="Job titles mapped to departments">
            <div className="space-y-2 mt-2 max-h-96 overflow-y-auto">
              {designations.map((desig) => (
                <div
                  key={desig._id}
                  className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-semibold text-slate-main">{desig.title}</span>
                    <span className="ml-2 text-[10px] text-slate-400">
                      {(desig.departmentId as any)?.name || 'General'}
                    </span>
                  </div>
                  <span className="text-[10px] bg-indigo-50 text-primary font-bold px-2 py-0.5 rounded border border-indigo-200">
                    {desig.grade || 'L2'}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Tab 3: Public Holidays */}
      {activeTab === 'holidays' && (
        <Card
          title="Public Holidays Calendar"
          subtitle="Excluded automatically from working day leave & payroll deductions"
          action={
            isAdmin && (
              <button
                onClick={() => setIsAddHolidayModal(true)}
                className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-semibold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Holiday
              </button>
            )
          }
        >
          <div className="overflow-x-auto mt-2">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="pb-3 px-3">Holiday Name</th>
                  <th className="pb-3 px-3">Date</th>
                  <th className="pb-3 px-3">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {holidays.length > 0 ? (
                  holidays.map((h) => (
                    <tr key={h._id}>
                      <td className="py-3 px-3 font-semibold text-slate-main">{h.name}</td>
                      <td className="py-3 px-3 font-mono text-primary font-bold">{h.date}</td>
                      <td className="py-3 px-3 text-slate-500">{h.description || '-'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-slate-400">
                      No public holidays configured. Click "Add Holiday" to declare organization holidays.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Tab 4: HR Logins Management (Admin ONLY) */}
      {activeTab === 'users' && isAdmin && (
        <Card
          title="HR Account Logins"
          subtitle="Manage authorized HR and Operations managers"
          action={
            <button
              onClick={() => setIsAddHrUserModal(true)}
              className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-semibold flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Create HR Login
            </button>
          }
        >
          <div className="overflow-x-auto mt-2">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="pb-3 px-3">Name</th>
                  <th className="pb-3 px-3">Email</th>
                  <th className="pb-3 px-3">Role</th>
                  <th className="pb-3 px-3">Status</th>
                  <th className="pb-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {hrUsers.map((u) => (
                  <tr key={u._id} className="hover:bg-slate-50/60">
                    <td className="py-3 px-3 font-medium text-slate-main">{u.name}</td>
                    <td className="py-3 px-3 text-slate-600 font-mono">{u.email}</td>
                    <td className="py-3 px-3">
                      <Badge status={u.role} />
                    </td>
                    <td className="py-3 px-3">
                      <Badge status={u.isActive ? 'active' : 'inactive'} />
                    </td>
                    <td className="py-3 px-3 text-right">
                      {u.role !== 'admin' && (
                        <button
                          onClick={() => handleToggleUser(u._id)}
                          className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-2 py-1 bg-slate-100 rounded"
                        >
                          {u.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Add Department Modal */}
      <Modal isOpen={isAddDeptModal} onClose={() => setIsAddDeptModal(false)} title="Add Department">
        <form onSubmit={handleAddDeptSubmit} className="space-y-3">
          <div>
            <label className="text-[11px] font-semibold text-slate-700">Department Name</label>
            <input
              type="text"
              required
              value={newDept.name}
              onChange={(e) => setNewDept({ ...newDept, name: e.target.value })}
              className="w-full text-xs px-3 py-2 rounded-xl border border-slate-border mt-1"
              placeholder="e.g. Finance"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-slate-700">Department Code</label>
            <input
              type="text"
              required
              value={newDept.code}
              onChange={(e) => setNewDept({ ...newDept, code: e.target.value.toUpperCase() })}
              className="w-full text-xs px-3 py-2 rounded-xl border border-slate-border mt-1"
              placeholder="e.g. FIN"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAddDeptModal(false)}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold"
            >
              Cancel
            </button>
            <button type="submit" className="px-5 py-2 bg-primary text-white rounded-xl text-xs font-semibold">
              Save Department
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Holiday Modal */}
      <Modal isOpen={isAddHolidayModal} onClose={() => setIsAddHolidayModal(false)} title="Add Public Holiday">
        <form onSubmit={handleAddHolidaySubmit} className="space-y-3">
          <div>
            <label className="text-[11px] font-semibold text-slate-700">Holiday Title</label>
            <input
              type="text"
              required
              value={newHoliday.name}
              onChange={(e) => setNewHoliday({ ...newHoliday, name: e.target.value })}
              className="w-full text-xs px-3 py-2 rounded-xl border border-slate-border mt-1"
              placeholder="e.g. Pakistan Day"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-slate-700">Date</label>
            <input
              type="date"
              required
              value={newHoliday.date}
              onChange={(e) => setNewHoliday({ ...newHoliday, date: e.target.value })}
              className="w-full text-xs px-3 py-2 rounded-xl border border-slate-border mt-1"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAddHolidayModal(false)}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold"
            >
              Cancel
            </button>
            <button type="submit" className="px-5 py-2 bg-primary text-white rounded-xl text-xs font-semibold">
              Save Holiday
            </button>
          </div>
        </form>
      </Modal>

      {/* Add HR User Modal */}
      <Modal isOpen={isAddHrUserModal} onClose={() => setIsAddHrUserModal(false)} title="Create HR Login Account">
        <form onSubmit={handleAddHrUserSubmit} className="space-y-3">
          <div>
            <label className="text-[11px] font-semibold text-slate-700">Full Name</label>
            <input
              type="text"
              required
              value={newHrUser.name}
              onChange={(e) => setNewHrUser({ ...newHrUser, name: e.target.value })}
              className="w-full text-xs px-3 py-2 rounded-xl border border-slate-border mt-1"
              placeholder="Sarah Khan"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-slate-700">Email Address</label>
            <input
              type="email"
              required
              value={newHrUser.email}
              onChange={(e) => setNewHrUser({ ...newHrUser, email: e.target.value })}
              className="w-full text-xs px-3 py-2 rounded-xl border border-slate-border mt-1"
              placeholder="hr@saylani.org"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-slate-700">Temporary Password</label>
            <input
              type="text"
              required
              value={newHrUser.password}
              onChange={(e) => setNewHrUser({ ...newHrUser, password: e.target.value })}
              className="w-full text-xs px-3 py-2 rounded-xl border border-slate-border mt-1"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAddHrUserModal(false)}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold"
            >
              Cancel
            </button>
            <button type="submit" className="px-5 py-2 bg-primary text-white rounded-xl text-xs font-semibold">
              Create HR Account
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
