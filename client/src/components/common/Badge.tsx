import React from 'react';

interface BadgeProps {
  status: string;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ status, className = '' }) => {
  const s = (status || '').toLowerCase().replace(/_/g, ' ');

  let colorClasses = 'bg-slate-100 text-slate-700 border-slate-200';

  // Attendance & Statuses
  if (['present', 'approved', 'active', 'finalized', 'locked'].includes(s)) {
    colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  } else if (['late', 'probation', 'warning'].includes(s)) {
    colorClasses = 'bg-amber-50 text-amber-700 border-amber-200';
  } else if (['half day', 'pending', 'draft'].includes(s)) {
    colorClasses = 'bg-indigo-50 text-indigo-700 border-indigo-200';
  } else if (['absent', 'rejected', 'cancelled', 'inactive', 'leaver'].includes(s)) {
    colorClasses = 'bg-rose-50 text-rose-700 border-rose-200';
  } else if (['on leave'].includes(s)) {
    colorClasses = 'bg-purple-50 text-purple-700 border-purple-200';
  } else if (['admin'].includes(s)) {
    colorClasses = 'bg-indigo-100 text-indigo-800 border-indigo-300 font-semibold';
  } else if (['hr'].includes(s)) {
    colorClasses = 'bg-teal-50 text-teal-700 border-teal-200 font-semibold';
  } else if (['employee'].includes(s)) {
    colorClasses = 'bg-sky-50 text-sky-700 border-sky-200';
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize tracking-wide ${colorClasses} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-70" />
      {s}
    </span>
  );
};
