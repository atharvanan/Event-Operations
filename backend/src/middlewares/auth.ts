import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { verifyToken, TokenPayload } from '../utils/jwt.js';
import { User, IUser } from '../models/User.js';
import { OrganizationMembership } from '../models/OrganizationMembership.js';
import { EventMembership } from '../models/EventMembership.js';
import { Event } from '../models/Event.js';
import { OrgRole, EventRole } from '../constants/index.js';

export interface AuthenticatedRequest extends Request {
  user?: IUser & { _id: mongoose.Types.ObjectId };
  tokenPayload?: TokenPayload;
  orgRole?: OrgRole;
  eventRole?: EventRole;
}

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ success: false, message: 'Authentication required. No token provided.' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyToken(token);
    req.tokenPayload = payload;

    const user = await User.findById(payload.userId);
    if (!user || !user.isActive) {
      res.status(401).json({ success: false, message: 'User not found or account is deactivated.' });
      return;
    }

    req.user = user as IUser & { _id: mongoose.Types.ObjectId };
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
};

export const requireOrgRole = (allowedRoles: OrgRole[]) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Authentication required.' });
        return;
      }

      const orgId = req.params.orgId || req.body.orgId || req.headers['x-org-id'];
      if (!orgId) {
        res.status(400).json({ success: false, message: 'Organization ID is required.' });
        return;
      }

      const membership = await OrganizationMembership.findOne({
        orgId: new mongoose.Types.ObjectId(orgId as string),
        userId: req.user._id,
        status: 'active',
      });

      if (!membership || !allowedRoles.includes(membership.role)) {
        res.status(403).json({
          success: false,
          message: 'Forbidden. You do not have the required organization permissions.',
        });
        return;
      }

      req.orgRole = membership.role;
      next();
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error checking organization role.', error });
    }
  };
};

export const requireEventRole = (allowedRoles: EventRole[]) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Authentication required.' });
        return;
      }

      const eventId = req.params.eventId || req.params.id || req.body.eventId;
      if (!eventId) {
        res.status(400).json({ success: false, message: 'Event ID is required.' });
        return;
      }

      const event = await Event.findById(eventId);
      if (!event) {
        res.status(404).json({ success: false, message: 'Event not found.' });
        return;
      }

      // Check if user is the direct event manager
      if (event.managerId.toString() === req.user._id.toString()) {
        req.eventRole = EventRole.EVENT_MANAGER;
        next();
        return;
      }

      // Check if user is organization Owner or Admin
      const orgMembership = await OrganizationMembership.findOne({
        orgId: event.orgId,
        userId: req.user._id,
        status: 'active',
      });

      if (orgMembership && (orgMembership.role === OrgRole.OWNER || orgMembership.role === OrgRole.ADMIN)) {
        req.eventRole = EventRole.EVENT_MANAGER;
        next();
        return;
      }

      // Check specific event membership
      const eventMembership = await EventMembership.findOne({
        eventId: new mongoose.Types.ObjectId(eventId as string),
        userId: req.user._id,
        status: 'active',
      });

      if (!eventMembership || !allowedRoles.includes(eventMembership.role)) {
        res.status(403).json({
          success: false,
          message: 'Forbidden. You do not have the required permissions for this event.',
        });
        return;
      }

      req.eventRole = eventMembership.role;
      next();
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error checking event permissions.', error });
    }
  };
};
