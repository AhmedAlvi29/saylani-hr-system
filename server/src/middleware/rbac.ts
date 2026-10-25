import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../models/User';

export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: `Forbidden: Role '${req.user.role}' is not authorized to perform this action.`,
      });
      return;
    }

    next();
  };
};

export const enforceDataScope = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Authentication required.' });
    return;
  }

  // Admin and HR have full visibility over company data
  if (req.user.role === 'admin' || req.user.role === 'hr') {
    return next();
  }

  // Employee role can ONLY access their own records
  if (req.user.role === 'employee') {
    const userEmployeeId = req.user.employeeId ? String(req.user.employeeId) : undefined;
    if (!userEmployeeId) {
      res.status(403).json({
        success: false,
        message: 'No employee record associated with this account.',
      });
      return;
    }

    // If an entity :id is targeted in path parameters (e.g., /employees/:id), verify it strictly matches own employee ID
    if (req.params?.id && String(req.params.id) !== userEmployeeId) {
      res.status(403).json({
        success: false,
        message: 'Access denied: You are only authorized to view and manage your own employee records.',
      });
      return;
    }
  }

  next();
};
