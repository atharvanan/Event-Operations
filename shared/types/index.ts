// Shared Type Definitions for Event Operations Platform

export enum OrgRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
}

export enum EventRole {
  EVENT_MANAGER = 'EVENT_MANAGER',
  TEAM_LEAD = 'TEAM_LEAD',
  TEAM_MEMBER = 'TEAM_MEMBER',
  VENDOR_CLIENT = 'VENDOR_CLIENT',
}

export enum TaskStatus {
  TO_DO = 'TO_DO',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  IN_PROGRESS = 'IN_PROGRESS',
  BLOCKED = 'BLOCKED',
  SUBMITTED_FOR_REVIEW = 'SUBMITTED_FOR_REVIEW',
  REWORK_REQUIRED = 'REWORK_REQUIRED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
  CRITICAL = 'CRITICAL',
}

export enum EvidenceReviewStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CLARIFICATION_REQUESTED = 'CLARIFICATION_REQUESTED',
}

export enum MediaType {
  PHOTO = 'PHOTO',
  VIDEO = 'VIDEO',
  AUDIO = 'AUDIO',
  DOCUMENT = 'DOCUMENT',
}

export enum ConversationType {
  GLOBAL_EVENT = 'GLOBAL_EVENT',
  MANAGER_TEAM = 'MANAGER_TEAM',
  MANAGER_LEAD = 'MANAGER_LEAD',
  TEAM_INTERNAL = 'TEAM_INTERNAL',
  DIRECT = 'DIRECT',
}

export enum MessageType {
  TEXT = 'TEXT',
  PHOTO = 'PHOTO',
  VOICE_NOTE = 'VOICE_NOTE',
  TASK_LINK = 'TASK_LINK',
  FILE = 'FILE',
}

export interface IConversation {
  _id: string;
  eventId: string;
  type: ConversationType;
  title: string;
  participantIds: string[];
  teamId?: string;
  lastMessageAt?: string;
  lastMessage?: any;
  unreadCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface IMessage {
  _id: string;
  conversationId: string;
  senderId: IUserProfile;
  content: string;
  messageType: MessageType;
  mediaUrl?: string;
  durationSeconds?: number;
  taskIdReference?: any;
  replyToMessageId?: any;
  readBy: { userId: string; readAt: string }[];
  createdAt: string;
  updatedAt: string;
}

export type SupportedLanguage = 'en' | 'hi' | 'mr';

export interface IUserProfile {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  preferredLanguage: SupportedLanguage;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IOrganization {
  _id: string;
  name: string;
  slug: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface IEventPermissions {
  allowWorkersGlobalChat: boolean;
  allowWorkersTeamChat: boolean;
  requireLeadReviewFirst: boolean;
  allowLeadTaskCreation: boolean;
  allowWorkerSelfAssignment: boolean;
}

export interface IEventRegistrationConfig {
  enabled: boolean;
  capacity: number;
  requireApproval: boolean;
  checkInOpen: boolean;
  requirements: string[];
}

export interface IEvent {
  _id: string;
  orgId: string;
  name: string;
  type: string;
  venue: string;
  address?: string;
  locationDetails?: string;
  eventMode?: 'in_person' | 'hybrid' | 'virtual';
  coverImage?: string;
  zones: string[];
  managerId: string | any;
  startDate: string;
  endDate: string;
  status: 'planning' | 'live_setup' | 'in_progress' | 'completed' | 'archived';
  description?: string;
  permissions?: IEventPermissions;
  registrationConfig?: IEventRegistrationConfig;
  registeredCount?: number;
  checkedInCount?: number;
  totalTasksCount?: number;
  completedTasksCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface IAttendee {
  _id: string;
  eventId: string;
  name: string;
  email: string;
  phone?: string;
  ticketCode: string;
  qrPayload: string;
  ticketType: 'General' | 'VIP' | 'Speaker' | 'Staff';
  status: 'registered' | 'checked_in' | 'cancelled';
  checkedInAt?: string;
  checkedInBy?: string | IUserProfile;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IEventResource {
  _id: string;
  eventId: string | any;
  uploaderId: string | IUserProfile;
  title: string;
  description?: string;
  category: 'Floor Plan' | 'Schedule' | 'Checklist' | 'Briefing' | 'Media' | 'Other';
  fileUrl: string;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  createdAt: string;
  updatedAt: string;
}

export interface ITeam {
  _id: string;
  eventId: string;
  name: string;
  description?: string;
  leadId?: string;
  lead?: IUserProfile;
  memberIds: string[];
  members?: IUserProfile[];
  colorHex: string;
  icon?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ITask {
  _id: string;
  eventId: string;
  teamId: string;
  parentTaskId?: string | null;
  title: string;
  description: string;
  zone?: string;
  status: TaskStatus;
  priority: TaskPriority;
  isUrgentEscalated: boolean;
  escalationReason?: string;
  assigneeId?: string;
  assignee?: IUserProfile;
  creatorId: string;
  startTime?: string;
  dueTime: string;
  completedAt?: string;
  dependencies: string[];
  evidenceRequired: boolean;
  minEvidenceCount: number;
  evidenceTypes: MediaType[];
  reworkReason?: string;
  microtasksCount?: number;
  completedMicrotasksCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface IEvidence {
  _id: string;
  taskId: string;
  uploaderId: string;
  uploader?: IUserProfile;
  fileUrl: string;
  thumbnailUrl?: string;
  mediaType: MediaType;
  fileSizeBytes: number;
  caption?: string;
  stage: 'during_progress' | 'completion_proof';
  reviewStatus: EvidenceReviewStatus;
  reviewerId?: string;
  reviewer?: IUserProfile;
  reviewNote?: string;
  reviewedAt?: string;
  createdAt: string;
}

export interface ITaskActivity {
  _id: string;
  taskId: string;
  actorId: string;
  actor?: IUserProfile;
  action: string;
  previousValue?: string;
  newValue?: string;
  reason?: string;
  createdAt: string;
}

export interface INotification {
  _id: string;
  userId: string;
  eventId?: string;
  taskId?: string;
  title: string;
  message: string;
  type: 'TASK_ASSIGNED' | 'TASK_STATUS_CHANGED' | 'PROOF_UPLOADED' | 'REWORK_REQUIRED' | 'BLOCKER_RAISED' | 'MENTION' | 'BROADCAST';
  isRead: boolean;
  linkUrl?: string;
  createdAt: string;
}

export interface IWorkloadTeamSummary {
  teamId: string;
  teamName: string;
  colorHex: string;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  blockedTasks: number;
  membersCount: number;
}

export interface IWorkloadWorkerSummary {
  userId: string;
  name: string;
  avatarUrl?: string;
  teamName: string;
  assignedTasksCount: number;
  activeTasksCount: number;
  isOverloaded: boolean;
}

