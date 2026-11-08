import mongoose, { Document, Schema } from 'mongoose';

export interface IOrganizationDoc extends Document {
  name: string;
  slug: string;
  ownerId: mongoose.Types.ObjectId;
  settings: {
    allowMemberDirectChat: boolean;
    requireEvidenceApproval: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const organizationSchema = new Schema<IOrganizationDoc>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    settings: {
      allowMemberDirectChat: { type: Boolean, default: true },
      requireEvidenceApproval: { type: Boolean, default: true },
    },
  },
  {
    timestamps: true,
  }
);

export const Organization = mongoose.model<IOrganizationDoc>('Organization', organizationSchema);
