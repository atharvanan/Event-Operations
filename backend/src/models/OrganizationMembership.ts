import mongoose, { Document, Schema } from 'mongoose';
import { OrgRole } from '../constants/index.js';

export interface IOrganizationMembership extends Document {
  userId: mongoose.Types.ObjectId;
  orgId: mongoose.Types.ObjectId;
  role: OrgRole;
  status: 'active' | 'invited' | 'suspended';
  createdAt: Date;
  updatedAt: Date;
}

const organizationMembershipSchema = new Schema<IOrganizationMembership>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    role: {
      type: String,
      enum: Object.values(OrgRole),
      default: OrgRole.MEMBER,
    },
    status: {
      type: String,
      enum: ['active', 'invited', 'suspended'],
      default: 'active',
    },
  },
  {
    timestamps: true,
  }
);

organizationMembershipSchema.index({ userId: 1, orgId: 1 }, { unique: true });

export const OrganizationMembership = mongoose.model<IOrganizationMembership>(
  'OrganizationMembership',
  organizationMembershipSchema
);
