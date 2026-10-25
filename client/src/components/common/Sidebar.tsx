import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  CalendarDays,
  Receipt,
  Settings,
  BellRing,
  Building2,
  X,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const role = user?.role || 'employee';

  const navItems = [
    // Dashboards
    ...(role === 'admin'
      ? [
          {
            name: 'Company Dashboard',
            to: '/admin/dashboard',
            icon: LayoutDashboard,
          },
        ]
      : role === 'hr'
      ? [
          {
            name: 'HR Dashboard',
            to: '/hr/dashboard',
            icon: LayoutDashboard,
          },
        ]
      : [
          {
            name: 'My Dashboard',
            to: '/employee/dashboard',
            icon: LayoutDashboard,
          },
        ]),

    // Core HR Modules
    {
      name: role === 'employee' ? 'My Profile & Directory' : 'Employees',
      to: '/employees',
      icon: Users,
    },
    {
      name: role === 'employee' ? 'My Attendance' : 'Attendance Board',
      to: '/attendance',
      icon: CalendarCheck,
    },
    {
      name: role === 'employee' ? 'My Leaves & Quota' : 'Leave Management',
      to: '/leaves',
      icon: CalendarDays,
    },
    {
      name: role === 'employee' ? 'My Payslips' : 'Payroll Lite',
      to: '/payroll',
      icon: Receipt,
    },

    // Org Settings (Admin full manage, HR view)
    ...(role === 'admin' || role === 'hr'
      ? [
          {
            name: 'Organization Setup',
            to: '/settings',
            icon: Settings,
          },
        ]
      : []),

    // Comms & Audit
    {
      name: role === 'admin' ? 'Comms & Audit' : 'Announcements',
      to: '/comms',
      icon: BellRing,
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-xs lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-white border-r border-slate-border flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo / Header */}
        <div className="h-16 px-6 flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center font-bold shadow-soft">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight text-slate-main">
                HCM <span className="text-primary font-medium">Lite</span>
              </span>
              <p className="text-[10px] text-slate-muted font-medium uppercase tracking-wider">
                Saylani Hackathon
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close navigation sidebar"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Main Navigation
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-primary text-white shadow-soft font-semibold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-main'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* User Card at bottom */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 m-3 rounded-2xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 text-primary font-bold flex items-center justify-center text-sm border border-indigo-200">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-main truncate">{user?.name}</p>
              <p className="text-[10px] text-slate-muted capitalize">{user?.role} Portal</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
