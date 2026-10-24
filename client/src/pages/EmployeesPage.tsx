import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../services/api';
import { Employee, Department, Designation } from '../types';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import {
  Users,
  Search,
  Filter,
  Plus,
  FileSpreadsheet,
  Download,
  Eye,
  Edit2,
  Copy,
  CheckCircle2,
  AlertCircle,
  Building,
  DollarSign,
  Calendar,
  Check,
} from 'lucide-react';

export const EmployeesPage: React.FC = () => {
  const { user } = useAuth();
  const role = user?.role || 'employee';
  const isManager = role === 'admin' || role === 'hr';

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filters & Search
  const [search, setSearch] = useState<string>('');
  const [selectedDept, setSelectedDept] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [is360ModalOpen, setIs360ModalOpen] = useState<boolean>(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [selectedEmployee360, setSelectedEmployee360] = useState<any>(null);
  const [createdLoginCreds, setCreatedLoginCreds] = useState<any>(null);

  // Add Employee Form
  const [formData, setFormData] = useState({
    employeeCode: 'EMP-' + Math.floor(100 + Math.random() * 900),
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    departmentId: '',
    designationId: '',
    joiningDate: new Date().toISOString().split('T')[0],
    employmentStatus: 'active',
    gender: 'male',
    basicSalary: 80000,
    temporaryPassword: 'Welcome@123',
  });

  // CSV Import State
  const [csvText, setCsvText] = useState<string>('');
  const [dryRunReport, setDryRunReport] = useState<any>(null);
  const [isImporting, setIsImporting] = useState<boolean>(false);

  // Copy Creds state
  const [copied, setCopied] = useState<boolean>(false);

  const fetchEmployees = async () => {
    setIsLoading(true);
    try {
      const query = new URLSearchParams();
      if (search) query.append('search', search);
      if (selectedDept) query.append('department', selectedDept);
      if (selectedStatus) query.append('status', selectedStatus);
      query.append('page', page.toString());
      query.append('limit', '15');

      const data = await apiRequest<{
        employees: Employee[];
        pagination: { total: number; totalPages: number };
      }>(`/employees?${query.toString()}`);

      setEmployees(data.employees || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMetadata = async () => {
    try {
      const [depts, desigs] = await Promise.all([
        apiRequest<Department[]>('/org/departments'),
        apiRequest<Designation[]>('/org/designations'),
      ]);
      setDepartments(depts || []);
      setDesignations(desigs || []);
      if (depts?.length > 0 && !formData.departmentId) {
        setFormData((prev) => ({ ...prev, departmentId: depts[0]._id }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchMetadata();
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [search, selectedDept, selectedStatus, page]);

  // Open 360 Profile
  const handleOpen360 = async (empId: string) => {
    try {
      const data = await apiRequest(`/employees/${empId}`);
      setSelectedEmployee360(data);
      setIs360ModalOpen(true);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Add Employee Submit
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiRequest('/employees', {
        method: 'POST',
        body: JSON.stringify(formData),
      });

      setCreatedLoginCreds(res.login);
      setIsAddModalOpen(false);
      fetchEmployees();
    } catch (err: any) {
      alert(err.message || 'Failed to add employee');
    }
  };

  // CSV Dry Run & Import
  const handleCsvValidate = async (dryRun: boolean) => {
    setIsImporting(true);
    try {
      // Parse CSV text into array of objects
      const lines = csvText.trim().split('\n');
      if (lines.length < 2) {
        alert('Please paste a CSV with at least one header row and one data row.');
        setIsImporting(false);
        return;
      }

      const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
      const rows = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
        const obj: any = {};
        headers.forEach((h, idx) => {
          obj[h] = values[idx];
        });
        rows.push(obj);
      }

      const report = await apiRequest('/employees/import-csv', {
        method: 'POST',
        body: JSON.stringify({ rows, dryRun }),
      });

      setDryRunReport(report);
      if (!dryRun) {
        alert(`Successfully imported ${report.importedCount} employees!`);
        setIsImportModalOpen(false);
        fetchEmployees();
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsImporting(false);
    }
  };

  // Live Gross Calculation Preview
  const previewBasic = formData.basicSalary || 0;
  const previewHra = Math.round(previewBasic * 0.4);
  const previewMed = Math.round(previewBasic * 0.1);
  const previewGross = previewBasic + previewHra + previewMed;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-main">
            {role === 'employee' ? 'My Profile & Directory' : 'Employee Management'}
          </h1>
          <p className="text-xs text-slate-muted">
            Directory search, profile records, and salary structures
          </p>
        </div>

        {isManager && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setCsvText(
                  'employeeCode,firstName,lastName,email,department,salary\nEMP-101,Hamza,Sheikh,hamza@saylani.org,ENG,95000\nEMP-102,Zainab,Tariq,zainab@saylani.org,HR,85000'
                );
                setDryRunReport(null);
                setIsImportModalOpen(true);
              }}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Import CSV
            </button>

            <a
              href="/api/employees/export-csv"
              download
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-4 h-4 text-slate-600" /> Export CSV
            </a>

            <button
              onClick={() => {
                setFormData({
                  employeeCode: 'EMP-' + Math.floor(100 + Math.random() * 900),
                  firstName: '',
                  lastName: '',
                  email: '',
                  phone: '',
                  address: '',
                  departmentId: departments[0]?._id || '',
                  designationId: designations[0]?._id || '',
                  joiningDate: new Date().toISOString().split('T')[0],
                  employmentStatus: 'active',
                  gender: 'male',
                  basicSalary: 80000,
                  temporaryPassword: 'Welcome@123',
                });
                setIsAddModalOpen(true);
              }}
              className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-soft transition-all"
            >
              <Plus className="w-4 h-4" /> Add Employee
            </button>
          </div>
        )}
      </div>

      {/* Filter & Search Bar */}
      <Card className="p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, employee code, or email..."
              className="w-full text-xs pl-10 pr-3.5 py-2 rounded-xl border border-slate-border focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          {isManager && (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="text-xs px-3 py-2 rounded-xl border border-slate-border bg-white text-slate-700"
              >
                <option value="">All Departments</option>
                {departments.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.name}
                  </option>
                ))}
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="text-xs px-3 py-2 rounded-xl border border-slate-border bg-white text-slate-700"
              >
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="probation">Probation</option>
                <option value="leaver">Leaver</option>
              </select>
            </div>
          )}
        </div>
      </Card>

      {/* Directory Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="pb-3 px-3">Code</th>
                <th className="pb-3 px-3">Name</th>
                <th className="pb-3 px-3">Department</th>
                <th className="pb-3 px-3">Designation</th>
                <th className="pb-3 px-3">Status</th>
                {isManager && <th className="pb-3 px-3 text-right">Gross Salary</th>}
                <th className="pb-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {employees.length > 0 ? (
                employees.map((emp) => (
                  <tr key={emp._id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-3 font-mono font-semibold text-primary">
                      {emp.employeeCode}
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-main">
                      <div>
                        {emp.firstName} {emp.lastName}
                      </div>
                      <div className="text-[10px] text-slate-400 font-normal">{emp.email}</div>
                    </td>
                    <td className="py-3 px-3 text-slate-600">
                      {emp.departmentId?.name || '-'}
                    </td>
                    <td className="py-3 px-3 text-slate-600">
                      {emp.designationId?.title || 'Staff Member'}
                    </td>
                    <td className="py-3 px-3">
                      <Badge status={emp.employmentStatus} />
                    </td>
                    {isManager && (
                      <td className="py-3 px-3 text-right font-semibold text-slate-main">
                        PKR {emp.grossSalary?.toLocaleString()}
                      </td>
                    )}
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => handleOpen360(emp._id)}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-lavender-100 text-slate-600 hover:text-primary transition-colors"
                        title="View Employee 360 Profile"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No employee records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add Employee Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Register New Employee"
        subtitle="Creates employee profile and auto-generates portal login"
        maxWidth="2xl"
      >
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-700">Employee Code</label>
              <input
                type="text"
                required
                value={formData.employeeCode}
                onChange={(e) => setFormData({ ...formData, employeeCode: e.target.value.toUpperCase() })}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-border mt-1"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-700">First Name</label>
              <input
                type="text"
                required
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-border mt-1"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-700">Last Name</label>
              <input
                type="text"
                required
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-border mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-700">Email Address (Login)</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-border mt-1"
                placeholder="employee@company.com"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-700">Phone</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-border mt-1"
                placeholder="+92 300 1234567"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-700">Department</label>
              <select
                required
                value={formData.departmentId}
                onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-border bg-white mt-1"
              >
                {departments.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.name} ({d.code})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-700">Designation</label>
              <select
                value={formData.designationId}
                onChange={(e) => setFormData({ ...formData, designationId: e.target.value })}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-border bg-white mt-1"
              >
                <option value="">Select designation...</option>
                {designations.map((desig) => (
                  <option key={desig._id} value={desig._id}>
                    {desig.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Salary Breakdown (Gross = 1.5 * Basic) */}
          <div className="p-3.5 bg-lavender-50 rounded-2xl border border-indigo-200">
            <span className="text-xs font-bold text-indigo-950 block mb-2">
              Salary Structure (Gross = 1.5 &times; Basic)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
              <div>
                <label className="text-[10px] text-slate-500 font-semibold">Basic Salary (PKR)</label>
                <input
                  type="number"
                  min="1000"
                  required
                  value={formData.basicSalary}
                  onChange={(e) =>
                    setFormData({ ...formData, basicSalary: parseInt(e.target.value, 10) || 0 })
                  }
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 mt-1 font-semibold"
                />
              </div>
              <div className="bg-white p-2 rounded-lg border border-indigo-100">
                <span className="text-[10px] text-slate-400">HRA (40%)</span>
                <div className="font-bold text-slate-700">PKR {previewHra.toLocaleString()}</div>
              </div>
              <div className="bg-white p-2 rounded-lg border border-indigo-100">
                <span className="text-[10px] text-slate-400">Medical (10%)</span>
                <div className="font-bold text-slate-700">PKR {previewMed.toLocaleString()}</div>
              </div>
              <div className="bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                <span className="text-[10px] text-emerald-800 font-semibold">Gross Salary</span>
                <div className="font-black text-emerald-900">PKR {previewGross.toLocaleString()}</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-700">Temporary Password</label>
              <input
                type="text"
                value={formData.temporaryPassword}
                onChange={(e) => setFormData({ ...formData, temporaryPassword: e.target.value })}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-border mt-1"
              />
              <span className="text-[10px] text-slate-400">User will be prompted to change on first login</span>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-700">Joining Date</label>
              <input
                type="date"
                value={formData.joiningDate}
                onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-border mt-1"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-semibold shadow-soft"
            >
              Register Employee
            </button>
          </div>
        </form>
      </Modal>

      {/* Generated Credentials Success Modal */}
      {createdLoginCreds && (
        <Modal
          isOpen={true}
          onClose={() => setCreatedLoginCreds(null)}
          title="Employee Credentials Generated"
          subtitle="Share these credentials securely with the employee"
        >
          <div className="space-y-3">
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-2">
              <div className="text-xs">
                <span className="text-slate-500 font-semibold">Login Email:</span>{' '}
                <span className="font-mono font-bold text-slate-main">{createdLoginCreds.email}</span>
              </div>
              <div className="text-xs">
                <span className="text-slate-500 font-semibold">Temporary Password:</span>{' '}
                <span className="font-mono font-bold text-slate-main">
                  {createdLoginCreds.temporaryPassword}
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                navigator.clipboard.writeText(
                  `Saylani HCM Portal Login:\nEmail: ${createdLoginCreds.email}\nTemporary Password: ${createdLoginCreds.temporaryPassword}`
                );
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="w-full py-2 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-soft"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied to Clipboard!' : 'Copy Login Details'}
            </button>
          </div>
        </Modal>
      )}

      {/* Employee 360 Modal */}
      {selectedEmployee360 && (
        <Modal
          isOpen={is360ModalOpen}
          onClose={() => setIs360ModalOpen(false)}
          title={`Employee 360 — ${selectedEmployee360.employee?.firstName} ${selectedEmployee360.employee?.lastName}`}
          subtitle={`Code: ${selectedEmployee360.employee?.employeeCode} | ${selectedEmployee360.employee?.departmentId?.name}`}
          maxWidth="4xl"
        >
          <div className="space-y-4">
            {/* Summary Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                <span className="text-slate-400">Designation</span>
                <div className="font-bold text-slate-main mt-0.5">
                  {selectedEmployee360.employee?.designationId?.title || 'Staff'}
                </div>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                <span className="text-slate-400">Joining Date</span>
                <div className="font-bold text-slate-main mt-0.5">
                  {new Date(selectedEmployee360.employee?.joiningDate).toLocaleDateString()}
                </div>
              </div>
              {isManager && (
                <>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                    <span className="text-slate-400">Basic Salary</span>
                    <div className="font-bold text-slate-main mt-0.5">
                      PKR {selectedEmployee360.employee?.basicSalary?.toLocaleString()}
                    </div>
                  </div>
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-xs">
                    <span className="text-emerald-700">Gross Salary</span>
                    <div className="font-black text-emerald-900 mt-0.5">
                      PKR {selectedEmployee360.employee?.grossSalary?.toLocaleString()}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Leave Balance Overview */}
            <div className="p-3 bg-white rounded-xl border border-slate-200">
              <span className="text-xs font-bold text-slate-main block mb-1.5">Leave Balance Overview</span>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="p-2 bg-indigo-50 rounded-lg">
                  <span className="text-[10px] text-primary">Annual Leave</span>
                  <div className="font-bold">
                    {(selectedEmployee360.leaveBalance?.annualQuota || 14) -
                      (selectedEmployee360.leaveBalance?.annualUsed || 0)}{' '}
                    days left
                  </div>
                </div>
                <div className="p-2 bg-teal-50 rounded-lg">
                  <span className="text-[10px] text-teal-700">Sick Leave</span>
                  <div className="font-bold">
                    {(selectedEmployee360.leaveBalance?.sickQuota || 8) -
                      (selectedEmployee360.leaveBalance?.sickUsed || 0)}{' '}
                    days left
                  </div>
                </div>
                <div className="p-2 bg-amber-50 rounded-lg">
                  <span className="text-[10px] text-amber-700">Casual Leave</span>
                  <div className="font-bold">
                    {(selectedEmployee360.leaveBalance?.casualQuota || 10) -
                      (selectedEmployee360.leaveBalance?.casualUsed || 0)}{' '}
                    days left
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Attendance */}
            <div>
              <span className="text-xs font-bold text-slate-main block mb-1.5">Recent Attendance Logs</span>
              <div className="max-h-40 overflow-y-auto border border-slate-100 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-400">
                    <tr>
                      <th className="p-2">Date</th>
                      <th className="p-2">Check In</th>
                      <th className="p-2">Check Out</th>
                      <th className="p-2">Hours</th>
                      <th className="p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedEmployee360.recentAttendance?.map((att: any) => (
                      <tr key={att._id}>
                        <td className="p-2 font-mono">{att.date}</td>
                        <td className="p-2">
                          {att.checkInTime
                            ? new Date(att.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : '-'}
                        </td>
                        <td className="p-2">
                          {att.checkOutTime
                            ? new Date(att.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : '-'}
                        </td>
                        <td className="p-2">{att.workingHours}h</td>
                        <td className="p-2">
                          <Badge status={att.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* CSV Import Modal with Dry-run verification */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="CSV Employee Import & Dry-Run Validation"
        subtitle="Validates required fields, unique employee code, unique email, and known departments"
        maxWidth="2xl"
      >
        <div className="space-y-4">
          <div>
            <label className="text-[11px] font-semibold text-slate-700 block mb-1">
              CSV Content (Headers: employeeCode, firstName, lastName, email, department, salary)
            </label>
            <textarea
              rows={5}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              className="w-full text-xs font-mono p-3 rounded-xl border border-slate-border focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          {/* Dry Run Error Report */}
          {dryRunReport && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span>Validation Result:</span>
                <span className="text-emerald-700">
                  {dryRunReport.validCount} Valid / {dryRunReport.totalRows} Total Rows
                </span>
              </div>

              {dryRunReport.errors?.length > 0 ? (
                <div className="max-h-36 overflow-y-auto space-y-1">
                  {dryRunReport.errors.map((err: any, idx: number) => (
                    <div key={idx} className="text-[11px] text-rose-600 bg-rose-50 p-1.5 rounded flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        Row {err.row} ({err.field}): {err.reason}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-emerald-700 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> All rows passed validation checks!
                </div>
              )}
            </div>
          )}

          <div className="flex justify-between items-center pt-2">
            <button
              type="button"
              onClick={() => handleCsvValidate(true)}
              disabled={isImporting}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
            >
              Run Dry-Run Check
            </button>

            <button
              type="button"
              onClick={() => handleCsvValidate(false)}
              disabled={isImporting || !dryRunReport || dryRunReport.validCount === 0}
              className="px-5 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-semibold shadow-soft disabled:opacity-50"
            >
              {isImporting ? 'Importing...' : 'Confirm & Import Valid Records'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
