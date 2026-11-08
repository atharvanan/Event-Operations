import { Response } from 'express';
import mongoose from 'mongoose';
import { Organization } from '../models/Organization.js';
import { OrganizationMembership } from '../models/OrganizationMembership.js';
import { User } from '../models/User.js';
import { OrgRole } from '../constants/index.js';
import { AuthenticatedRequest } from '../middlewares/auth.js';

export const createOrg = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { name, settings } = req.body;
    if (!name) {
      res.status(400).json({ success: false, message: 'Organization name is required.' });
      return;
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const organization = await Organization.create({
      name,
      slug: `${slug}-${Date.now().toString().slice(-4)}`,
      ownerId: req.user!._id,
      settings: settings || {},
    });

    await OrganizationMembership.create({
      userId: req.user!._id,
      orgId: organization._id,
      role: OrgRole.OWNER,
      status: 'active',
    });

    res.status(201).json({ success: true, data: organization });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error creating organization.' });
  }
};

export const getMyOrgs = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const memberships = await OrganizationMembership.find({
      userId: req.user!._id,
      status: 'active',
    }).populate('orgId');

    res.status(200).json({ success: true, data: memberships });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error fetching organizations.' });
  }
};

export const getOrgMembers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { orgId } = req.params;
    const members = await OrganizationMembership.find({
      orgId: new mongoose.Types.ObjectId(orgId),
    }).populate('userId', 'name email phone avatarUrl preferredLanguage');

    res.status(200).json({ success: true, data: members });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error fetching members.' });
  }
};

export const inviteMember = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { orgId } = req.params;
    const { email, name, role } = req.body;

    if (!email || !role) {
      res.status(400).json({ success: false, message: 'Email and role are required.' });
      return;
    }

    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        email,
        name: name || email.split('@')[0],
        password: 'ChangeMe@123', // Temporary password
        preferredLanguage: 'en',
      });
    }

    const existingMembership = await OrganizationMembership.findOne({
      orgId: new mongoose.Types.ObjectId(orgId),
      userId: user._id,
    });

    if (existingMembership) {
      existingMembership.role = role;
      existingMembership.status = 'active';
      await existingMembership.save();
      res.status(200).json({ success: true, data: existingMembership, message: 'Membership updated.' });
      return;
    }

    const membership = await OrganizationMembership.create({
      orgId: new mongoose.Types.ObjectId(orgId),
      userId: user._id,
      role,
      status: 'active',
    });

    res.status(201).json({ success: true, data: membership });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error inviting member.' });
  }
};
