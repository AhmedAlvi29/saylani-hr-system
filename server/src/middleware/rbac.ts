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
    const requestedEmployeeId = req.params.employeeId || req.query.employeeId || req.body.employeeId;

    if (!req.user.employeeId) {
      res.status(403).json({
        success: false,
        message: 'No employee record associated with this account.',
      });
      return;
    }

    // If an employeeId is explicitly targeted, ensure it strictly matches the logged in user's employeeId
    if (requestedEmployeeId && requestedEmployeeId.toString() !== req.user.employeeId.toString()) {
      res.status(403).json({
        success: false,
        message: 'Access denied: You are only authorized to view and manage your own employee records.',
      });
      return;
    }

    // Automatically enforce own employeeId on queries & mutations
    if (req.query) {
      req.query.employeeId = req.user.employeeId;
    }
    if (req.body && req.body.employeeId) {
      req.body.employeeId = req.user.employeeId;
    }
  }

  next();
};
