import { Request, Response } from 'express';
import { User } from '../models/User.js';
import { Organization } from '../models/Organization.js';
import { OrganizationMembership } from '../models/OrganizationMembership.js';
import { generateToken } from '../utils/jwt.js';
import { OrgRole } from '../constants/index.js';
import { AuthenticatedRequest } from '../middlewares/auth.js';

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, phone, organizationName, preferredLanguage } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
      return;
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400).json({ success: false, message: 'An account with this email already exists.' });
      return;
    }

    const user = await User.create({
      name,
      email,
      password,
      phone,
      preferredLanguage: preferredLanguage || 'en',
    });

    let organization = null;
    let membership = null;

    if (organizationName) {
      const slug = organizationName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      organization = await Organization.create({
        name: organizationName,
        slug: `${slug}-${Date.now().toString().slice(-4)}`,
        ownerId: user._id,
      });

      membership = await OrganizationMembership.create({
        userId: user._id,
        orgId: organization._id,
        role: OrgRole.OWNER,
        status: 'active',
      });
    }

    const token = generateToken({
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
    });

    res.status(201).json({
      success: true,
      data: {
        token,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          preferredLanguage: user.preferredLanguage,
        },
        organization,
        role: membership ? membership.role : null,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error registering user.' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ success: false, message: 'Email and password are required.' });
      return;
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user || !user.isActive) {
      res.status(401).json({ success: false, message: 'Invalid credentials or inactive account.' });
      return;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      res.status(401).json({ success: false, message: 'Invalid credentials.' });
      return;
    }

    // Get user's primary organization if any
    const membership = await OrganizationMembership.findOne({ userId: user._id, status: 'active' }).populate('orgId');

    const token = generateToken({
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
    });

    res.status(200).json({
      success: true,
      data: {
        token,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          preferredLanguage: user.preferredLanguage,
        },
        organization: membership ? membership.orgId : null,
        role: membership ? membership.role : null,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error logging in.' });
  }
};

export const getMe = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const memberships = await OrganizationMembership.find({
      userId: req.user._id,
      status: 'active',
    }).populate('orgId');

    res.status(200).json({
      success: true,
      data: {
        user: {
          _id: req.user._id,
          name: req.user.name,
          email: req.user.email,
          phone: req.user.phone,
          preferredLanguage: req.user.preferredLanguage,
          avatarUrl: req.user.avatarUrl,
        },
        memberships,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error retrieving profile.' });
  }
};

export const updateLanguage = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { preferredLanguage } = req.body;
    if (!['en', 'hi', 'mr'].includes(preferredLanguage)) {
      res.status(400).json({ success: false, message: 'Language must be en, hi, or mr.' });
      return;
    }

    req.user.preferredLanguage = preferredLanguage;
    await req.user.save();

    res.status(200).json({
      success: true,
      data: {
        preferredLanguage: req.user.preferredLanguage,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error updating language.' });
  }
};
