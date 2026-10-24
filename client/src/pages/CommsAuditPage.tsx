import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../services/api';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import {
  BellRing,
  Megaphone,
  ShieldCheck,
  Plus,
  Eye,
  CheckCircle2,
  Clock,
  Filter,
  Search,
} from 'lucide-react';

export const CommsAuditPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'admin' || user?.role === 'hr';

  const [activeTab, setActiveTab] = useState<'announcements' | 'audit'>('announcements');

  // Announcements State
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [isPostModalOpen, setIsPostModalOpen] = useState<boolean>(false);
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: '',
    content: '',
    priority: 'normal' as 'normal' | 'important',
    targetRole: 'all' as 'all' | 'hr' | 'employee',
  });

  // Audit Log State (Admin)
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [selectedAuditLog, setSelectedAuditLog] = useState<any>(null);
  const [auditFilter, setAuditFilter] = useState({ action: '', entity: '', actorEmail: '' });

  const fetchCommsData = async () => {
    try {
      const annRes = await apiRequest('/comms/announcements');
      setAnnouncements(annRes || []);

      if (isAdmin) {
        const query = new URLSearchParams();
        if (auditFilter.action) query.append('action', auditFilter.action);
        if (auditFilter.entity) query.append('entity', auditFilter.entity);
        if (auditFilter.actorEmail) query.append('actorEmail', auditFilter.actorEmail);

        const auditRes = await apiRequest<{ logs: any[] }>(`/comms/audit-logs?${query.toString()}`);
        setAuditLogs(auditRes.logs || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCommsData();
  }, [auditFilter]);

  // Post Announcement
  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/comms/announcements', {
        method: 'POST',
        body: JSON.stringify(newAnnouncement),
      });

      setIsPostModalOpen(false);
      setNewAnnouncement({ title: '', content: '', priority: 'normal', targetRole: 'all' });
      fetchCommsData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-main">
            {isAdmin ? 'Communications & Audit Logs' : 'Company Announcements'}
          </h1>
          <p className="text-xs text-slate-muted">
            Official broadcasts, updates, and tamper-evident administrative audit logs
          </p>
        </div>

        {isManager && (
          <button
            onClick={() => setIsPostModalOpen(true)}
            className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-soft transition-all"
          >
            <Plus className="w-4 h-4" /> Post Announcement
          </button>
        )}
      </div>

      {/* Tabs if Admin */}
      {isAdmin && (
        <div className="flex border-b border-slate-200 gap-2">
          <button
            onClick={() => setActiveTab('announcements')}
            className={`pb-3 text-xs sm:text-sm font-semibold border-b-2 px-3 transition-colors ${
              activeTab === 'announcements'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Announcements Feed
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`pb-3 text-xs sm:text-sm font-semibold border-b-2 px-3 transition-colors ${
              activeTab === 'audit'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            System Audit Trail
          </button>
        </div>
      )}

      {/* Announcements Feed */}
      {activeTab === 'announcements' && (
        <div className="space-y-4">
          {announcements.length > 0 ? (
            announcements.map((a) => (
              <Card key={a._id} className="hover:border-indigo-100">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-lavender-100 text-primary flex items-center justify-center shrink-0">
                      <Megaphone className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-sm text-slate-main">{a.title}</h3>
                        <Badge status={a.priority} />
                      </div>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">{a.content}</p>
                      <div className="text-[10px] text-slate-400 mt-2 flex items-center gap-2">
                        <span>Posted by {a.authorName}</span>
                        <span>&bull;</span>
                        <span>{new Date(a.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <Card>
              <div className="py-12 text-center text-xs text-slate-400">
                No announcements posted yet.
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Audit Log Table (Admin ONLY) */}
      {activeTab === 'audit' && isAdmin && (
        <div className="space-y-4">
          {/* Filters */}
          <Card className="p-3 sm:p-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] font-semibold text-slate-400 block mb-0.5">
                  Action
                </label>
                <input
                  type="text"
                  placeholder="e.g. UPDATE_COMPANY_SETTINGS"
                  value={auditFilter.action}
                  onChange={(e) => setAuditFilter({ ...auditFilter, action: e.target.value })}
                  className="w-full text-xs px-3 py-1.5 rounded-xl border border-slate-border"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400 block mb-0.5">
                  Entity
                </label>
                <input
                  type="text"
                  placeholder="e.g. Employee, PayrollRun"
                  value={auditFilter.entity}
                  onChange={(e) => setAuditFilter({ ...auditFilter, entity: e.target.value })}
                  className="w-full text-xs px-3 py-1.5 rounded-xl border border-slate-border"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400 block mb-0.5">
                  Actor Email
                </label>
                <input
                  type="text"
                  placeholder="e.g. admin@saylani.org"
                  value={auditFilter.actorEmail}
                  onChange={(e) => setAuditFilter({ ...auditFilter, actorEmail: e.target.value })}
                  className="w-full text-xs px-3 py-1.5 rounded-xl border border-slate-border"
                />
              </div>
            </div>
          </Card>

          <Card title="Administrative Audit Trail" subtitle="Immutable operational log">
            <div className="overflow-x-auto mt-2">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                    <th className="pb-3 px-3">Timestamp</th>
                    <th className="pb-3 px-3">Actor</th>
                    <th className="pb-3 px-3">Action</th>
                    <th className="pb-3 px-3">Entity</th>
                    <th className="pb-3 px-3">Details</th>
                    <th className="pb-3 px-3 text-right">Payload</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {auditLogs.length > 0 ? (
                    auditLogs.map((log) => (
                      <tr key={log._id} className="hover:bg-slate-50/60">
                        <td className="py-3 px-3 font-mono text-slate-400 whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td className="py-3 px-3 font-medium text-slate-main">
                          <div>{log.actorEmail}</div>
                          <span className="text-[10px] text-slate-400 capitalize">{log.actorRole}</span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-mono text-[11px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-semibold border border-indigo-200">
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-600 font-semibold">{log.entity}</td>
                        <td className="py-3 px-3 text-slate-500 max-w-xs truncate">{log.details || '-'}</td>
                        <td className="py-3 px-3 text-right">
                          {(log.beforeJson || log.afterJson) && (
                            <button
                              onClick={() => setSelectedAuditLog(log)}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-xs font-semibold"
                            >
                              View JSON
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        No audit records match the selected filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Post Announcement Modal */}
      <Modal
        isOpen={isPostModalOpen}
        onClose={() => setIsPostModalOpen(false)}
        title="Post Company Announcement"
        subtitle="Broadcast an update across employee and management dashboards"
      >
        <form onSubmit={handlePostSubmit} className="space-y-4">
          <div>
            <label className="text-[11px] font-semibold text-slate-700">Announcement Title</label>
            <input
              type="text"
              required
              value={newAnnouncement.title}
              onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
              className="w-full text-xs px-3 py-2 rounded-xl border border-slate-border mt-1"
              placeholder="e.g. Eid Holidays Schedule Announced"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-700">Priority</label>
              <select
                value={newAnnouncement.priority}
                onChange={(e) =>
                  setNewAnnouncement({ ...newAnnouncement, priority: e.target.value as any })
                }
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-border bg-white mt-1"
              >
                <option value="normal">Normal</option>
                <option value="important">Important (Highlighted)</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-700">Target Audience</label>
              <select
                value={newAnnouncement.targetRole}
                onChange={(e) =>
                  setNewAnnouncement({ ...newAnnouncement, targetRole: e.target.value as any })
                }
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-border bg-white mt-1"
              >
                <option value="all">Everyone (All Staff)</option>
                <option value="employee">Employees Only</option>
                <option value="hr">HR & Management Only</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-700">Content</label>
            <textarea
              required
              rows={4}
              value={newAnnouncement.content}
              onChange={(e) => setNewAnnouncement({ ...newAnnouncement, content: e.target.value })}
              placeholder="Write the message to be displayed on dashboards..."
              className="w-full text-xs px-3 py-2 rounded-xl border border-slate-border mt-1"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsPostModalOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-semibold shadow-soft"
            >
              Publish Announcement
            </button>
          </div>
        </form>
      </Modal>

      {/* JSON Viewer Modal for Audit Log */}
      {selectedAuditLog && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedAuditLog(null)}
          title={`Audit Payload: ${selectedAuditLog.action}`}
          subtitle={`Entity: ${selectedAuditLog.entity} | Time: ${new Date(selectedAuditLog.createdAt).toLocaleString()}`}
          maxWidth="2xl"
        >
          <div className="space-y-3">
            {selectedAuditLog.beforeJson && (
              <div>
                <span className="text-xs font-bold text-slate-700 block mb-1">State Before:</span>
                <pre className="bg-slate-900 text-slate-100 p-3 rounded-xl text-[11px] font-mono overflow-x-auto max-h-48">
                  {JSON.stringify(selectedAuditLog.beforeJson, null, 2)}
                </pre>
              </div>
            )}

            {selectedAuditLog.afterJson && (
              <div>
                <span className="text-xs font-bold text-emerald-700 block mb-1">State After:</span>
                <pre className="bg-slate-900 text-emerald-300 p-3 rounded-xl text-[11px] font-mono overflow-x-auto max-h-48">
                  {JSON.stringify(selectedAuditLog.afterJson, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
