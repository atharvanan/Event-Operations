import mongoose from 'mongoose';
import { User, IUser } from '../models/User.js';
import { Organization, IOrganizationDoc } from '../models/Organization.js';
import { OrganizationMembership } from '../models/OrganizationMembership.js';
import { Event } from '../models/Event.js';
import { EventMembership } from '../models/EventMembership.js';
import { Team } from '../models/Team.js';
import { Task } from '../models/Task.js';
import { TaskActivity } from '../models/TaskActivity.js';
import { Conversation } from '../models/Conversation.js';
import { Attendee } from '../models/Attendee.js';
import {
  ConversationType,
  EventRole,
  MediaType,
  OrgRole,
  TaskPriority,
  TaskStatus,
} from '../constants/index.js';

export const DEMO_PASSWORD = 'Password@123';

interface DemoUserSpec {
  name: string;
  email: string;
  preferredLanguage?: 'en' | 'hi' | 'mr';
}

interface TeamSeedSpec {
  name: string;
  description: string;
  colorHex: string;
  icon: string;
  lead: DemoUserSpec;
  workers: DemoUserSpec[];
  tasks: Array<{
    title: string;
    description: string;
    zone: string;
    priority: TaskPriority;
    offsetHours: number;
    status: TaskStatus;
    microtasks: Array<{
      title: string;
      assigneeIdx: number;
      status: TaskStatus;
    }>;
  }>;
}

const MANAGER_SPEC: DemoUserSpec = {
  name: 'Vikram Sethi',
  email: 'manager@royalweddings.com',
  preferredLanguage: 'en',
};

const TEAMS_DATA: TeamSeedSpec[] = [
  {
    name: 'Catering & Hospitality',
    description: '8 buffet stations, 4 live chaat counters, royal dessert bar, and dinner service',
    colorHex: '#10B981',
    icon: 'Utensils',
    lead: { name: 'Chef Rajesh Sharma', email: 'lead.catering@royalweddings.com', preferredLanguage: 'en' },
    workers: [
      { name: 'Sunil Kumar', email: 'worker.catering1@royalweddings.com', preferredLanguage: 'en' },
      { name: 'Amit Verma', email: 'worker.catering2@royalweddings.com', preferredLanguage: 'en' },
    ],
    tasks: [
      {
        title: 'Buffet Stations & Chafing Dishes Setup',
        description:
          'Deploy 8 chafing counters with table warmers, cutlery, and clean velvet table linen in Dining Lawn A',
        zone: 'Royal Dining Lawns',
        priority: TaskPriority.HIGH,
        offsetHours: 2,
        status: TaskStatus.IN_PROGRESS,
        microtasks: [
          {
            title: 'Sterno fuel cans and brass chafing dishes placement',
            assigneeIdx: 0,
            status: TaskStatus.COMPLETED,
          },
          {
            title: 'Plate stacks, soup bowls, and dinner cutlery replenishment',
            assigneeIdx: 1,
            status: TaskStatus.IN_PROGRESS,
          },
        ],
      },
      {
        title: 'Live Chaat & Dessert Counter Warmup',
        description: 'Test gas burners, deep fryers, and kulfi cooling units',
        zone: 'Royal Dining Lawns',
        priority: TaskPriority.MEDIUM,
        offsetHours: 4,
        status: TaskStatus.TO_DO,
        microtasks: [],
      },
    ],
  },
  {
    name: 'Stage Decoration & Floral',
    description: 'Grand royal mandap, floral backdrops, crystal chandeliers, and aisle carpets',
    colorHex: '#EC4899',
    icon: 'Sparkles',
    lead: { name: 'Pooja Patil', email: 'lead.decor@royalweddings.com', preferredLanguage: 'en' },
    workers: [
      { name: 'Manoj Shinde', email: 'member.stage@royalweddings.com', preferredLanguage: 'en' },
      { name: 'Suresh Patil', email: 'worker.decor1@royalweddings.com', preferredLanguage: 'en' },
    ],
    tasks: [
      {
        title: 'Mandap Structural Framework & Floral Arch',
        description:
          'Construct four carved pillars with marigold and red rose drapery. Verify anchoring with safety lead.',
        zone: 'Main Stage & Mandap',
        priority: TaskPriority.CRITICAL,
        offsetHours: 1,
        status: TaskStatus.SUBMITTED_FOR_REVIEW,
        microtasks: [
          {
            title: 'Pillar alignment and safety weight tie-down',
            assigneeIdx: 0,
            status: TaskStatus.COMPLETED,
          },
        ],
      },
    ],
  },
  {
    name: 'Lights & Audio-Visual',
    description: 'Overhead stage truss, LED video walls, beam lights, wireless microphones, and DJ console',
    colorHex: '#3B82F6',
    icon: 'Music',
    lead: { name: 'Rohan Deshmukh', email: 'lead.av@royalweddings.com', preferredLanguage: 'en' },
    workers: [
      { name: 'Rahul Joshi', email: 'worker.av1@royalweddings.com', preferredLanguage: 'en' },
    ],
    tasks: [
      {
        title: 'Stage Truss Rigging & LED Wall Calibration',
        description: 'Calibrate P3.9 outdoor LED screen color balance and test video feeds from switchers',
        zone: 'Main Stage & Mandap',
        priority: TaskPriority.HIGH,
        offsetHours: 2,
        status: TaskStatus.IN_PROGRESS,
        microtasks: [
          {
            title: 'Screen panel lock and HDMI matrix testing',
            assigneeIdx: 0,
            status: TaskStatus.IN_PROGRESS,
          },
        ],
      },
    ],
  },
  {
    name: 'Camera & Photography',
    description: 'Live broadcast jib, 4 roving candid photographers, drone pilots, and live stream feed',
    colorHex: '#8B5CF6',
    icon: 'Camera',
    lead: { name: 'Ananya Sen', email: 'lead.camera@royalweddings.com', preferredLanguage: 'en' },
    workers: [
      { name: 'Deepak Roy', email: 'worker.camera1@royalweddings.com', preferredLanguage: 'en' },
    ],
    tasks: [
      {
        title: 'Jimmy Jib Camera Calibration & Drone Clearance',
        description: 'Verify 360-degree jib arm swing clearance and test 4K wireless live transmitter to console',
        zone: 'Sound Control Deck',
        priority: TaskPriority.MEDIUM,
        offsetHours: 3,
        status: TaskStatus.TO_DO,
        microtasks: [],
      },
    ],
  },
  {
    name: 'Logistics & Guest Hospitality',
    description: 'VIP golf cart shuttles, welcome desks, safa tying stations, and security coordination',
    colorHex: '#F59E0B',
    icon: 'Shield',
    lead: { name: 'Sanjay Gupta', email: 'lead.logistics@royalweddings.com', preferredLanguage: 'en' },
    workers: [
      { name: 'Neha Rathi', email: 'worker.logistics1@royalweddings.com', preferredLanguage: 'en' },
    ],
    tasks: [
      {
        title: 'Welcome Arch Tilak & Garlanding Counter Setup',
        description: 'Setup rosewater sprayers, fresh mogra garlands, and traditional nagada players at gate 1',
        zone: 'Welcome Arch & Courtyard',
        priority: TaskPriority.HIGH,
        offsetHours: 2,
        status: TaskStatus.ACKNOWLEDGED,
        microtasks: [],
      },
    ],
  },
];

async function upsertDemoUser(spec: DemoUserSpec, resetPasswordIfMismatch: boolean): Promise<IUser> {
  const normalizedEmail = spec.email.trim().toLowerCase();
  const existing = await User.findOne({ email: normalizedEmail }).select('+password');

  if (!existing) {
    return User.create({
      name: spec.name,
      email: normalizedEmail,
      password: DEMO_PASSWORD,
      preferredLanguage: spec.preferredLanguage || 'en',
      isActive: true,
    });
  }

  let dirty = false;
  if (!existing.isActive) {
    existing.isActive = true;
    dirty = true;
  }

  if (resetPasswordIfMismatch) {
    const matches = await existing.comparePassword(DEMO_PASSWORD);
    if (!matches) {
      existing.password = DEMO_PASSWORD;
      dirty = true;
    }
    if (!existing.name || existing.name === 'vikram') {
      existing.name = spec.name;
      dirty = true;
    }
  }

  if (dirty) {
    await existing.save();
  }

  return existing;
}

async function ensureOrgMembership(
  userId: mongoose.Types.ObjectId,
  orgId: mongoose.Types.ObjectId,
  role: OrgRole
): Promise<void> {
  const existing = await OrganizationMembership.findOne({ userId, orgId });
  if (!existing) {
    await OrganizationMembership.create({
      userId,
      orgId,
      role,
      status: 'active',
    });
    return;
  }

  if (existing.status !== 'active') {
    existing.status = 'active';
    await existing.save();
  }
}

async function ensureEventMembership(
  eventId: mongoose.Types.ObjectId,
  userId: mongoose.Types.ObjectId,
  role: EventRole,
  teamId?: mongoose.Types.ObjectId
): Promise<void> {
  const existing = await EventMembership.findOne({ eventId, userId });
  if (!existing) {
    await EventMembership.create({
      eventId,
      userId,
      role,
      teamId,
      status: 'active',
    });
  }
}

async function resolveDemoOrganization(manager: IUser): Promise<IOrganizationDoc> {
  const canonical = await Organization.findOne({ slug: 'royal-heritage-weddings' });
  if (canonical) {
    return canonical;
  }

  const existingMembership = await OrganizationMembership.findOne({
    userId: manager._id,
    status: 'active',
  });
  if (existingMembership) {
    const existingOrg = await Organization.findById(existingMembership.orgId);
    if (existingOrg) {
      return existingOrg;
    }
  }

  return Organization.create({
    name: 'Royal Heritage Weddings & Events',
    slug: 'royal-heritage-weddings',
    ownerId: manager._id,
    settings: {
      allowMemberDirectChat: true,
      requireEvidenceApproval: true,
    },
  });
}

async function seedDemoWorkspaceEvents(
  org: IOrganizationDoc,
  manager: IUser,
  leadCatering: IUser,
  memberStage: IUser
): Promise<void> {
  const weddingStart = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
  const weddingEnd = new Date(weddingStart.getTime() + 14 * 60 * 60 * 1000);

  const weddingEvent = await Event.create({
    orgId: org._id,
    name: 'The Grand Heritage Palace Wedding & Sangeet',
    type: 'wedding',
    venue: 'Rambagh Heritage Courtyard, Jaipur',
    address: 'Bhawani Singh Road, Jaipur, Rajasthan',
    locationDetails: 'Main Lawn, Darbar Courtyard, and Entry Archway',
    eventMode: 'in_person',
    coverImage: '/images/events/wedding.svg',
    managerId: manager._id,
    startDate: weddingStart,
    endDate: weddingEnd,
    zones: [
      'Main Stage & Mandap',
      'Royal Dining Lawns',
      'VIP Bride/Groom Suites',
      'Welcome Arch & Courtyard',
      'Sound Control Deck',
    ],
    status: 'in_progress',
    description:
      'High-profile 800-guest destination wedding featuring live sangeet performances, 5-station royal feast, and floral mandap decor.',
    registrationConfig: {
      enabled: true,
      capacity: 850,
      requireApproval: false,
      checkInOpen: true,
      requirements: ['Government Photo ID', 'Digital Invite Pass'],
    },
  });

  await ensureEventMembership(weddingEvent._id, manager._id, EventRole.EVENT_MANAGER);

  const globalChat = await Conversation.create({
    eventId: weddingEvent._id,
    type: ConversationType.GLOBAL_EVENT,
    title: 'The Grand Heritage Palace Wedding — All-Hands Ops',
    participantIds: [manager._id],
  });

  for (const tData of TEAMS_DATA) {
    const leadUser =
      tData.lead.email === leadCatering.email
        ? leadCatering
        : await upsertDemoUser(tData.lead, false);
    await ensureOrgMembership(leadUser._id, org._id, OrgRole.MEMBER);

    const workerUsers: IUser[] = [];
    for (const w of tData.workers) {
      const workerUser =
        w.email === memberStage.email ? memberStage : await upsertDemoUser(w, false);
      await ensureOrgMembership(workerUser._id, org._id, OrgRole.MEMBER);
      workerUsers.push(workerUser);
    }

    const team = await Team.create({
      eventId: weddingEvent._id,
      name: tData.name,
      description: tData.description,
      colorHex: tData.colorHex,
      icon: tData.icon,
      leadId: leadUser._id,
      memberIds: workerUsers.map((w) => w._id),
      isActive: true,
    });

    await ensureEventMembership(weddingEvent._id, leadUser._id, EventRole.TEAM_LEAD, team._id);
    for (const worker of workerUsers) {
      await ensureEventMembership(weddingEvent._id, worker._id, EventRole.TEAM_MEMBER, team._id);
    }

    await Conversation.updateOne(
      { _id: globalChat._id },
      {
        $addToSet: {
          participantIds: { $each: [leadUser._id, ...workerUsers.map((w) => w._id)] },
        },
      }
    );

    await Conversation.create({
      eventId: weddingEvent._id,
      type: ConversationType.TEAM_INTERNAL,
      teamId: team._id,
      title: `${tData.name} Team Comms`,
      participantIds: [leadUser._id, ...workerUsers.map((w) => w._id)],
    });

    await Conversation.create({
      eventId: weddingEvent._id,
      type: ConversationType.MANAGER_TEAM,
      teamId: team._id,
      title: `${tData.name} <-> Manager Channel`,
      participantIds: [manager._id, leadUser._id, ...workerUsers.map((w) => w._id)],
    });

    for (const taskItem of tData.tasks) {
      const due = new Date();
      due.setHours(due.getHours() + taskItem.offsetHours);

      const parentTask = await Task.create({
        eventId: weddingEvent._id,
        teamId: team._id,
        parentTaskId: null,
        title: taskItem.title,
        description: taskItem.description,
        zone: taskItem.zone,
        priority: taskItem.priority,
        status: taskItem.status,
        assigneeId: leadUser._id,
        creatorId: manager._id,
        dueTime: due,
        evidenceRequired: true,
        minEvidenceCount: 1,
        evidenceTypes: [MediaType.PHOTO],
      });

      await TaskActivity.create({
        taskId: parentTask._id,
        actorId: manager._id,
        action: 'PARENT_TASK_CREATED',
        newValue: taskItem.title,
      });

      for (const mItem of taskItem.microtasks) {
        const microDue = new Date(due.getTime() - 30 * 60 * 1000);
        const assignedWorker = workerUsers[mItem.assigneeIdx] || workerUsers[0];

        const microtask = await Task.create({
          eventId: weddingEvent._id,
          teamId: team._id,
          parentTaskId: parentTask._id,
          title: mItem.title,
          description: `Execute ${mItem.title} with highest attention to cleanliness and promptness.`,
          zone: taskItem.zone,
          priority: taskItem.priority,
          status: mItem.status,
          assigneeId: assignedWorker._id,
          creatorId: leadUser._id,
          dueTime: microDue,
          evidenceRequired: true,
          minEvidenceCount: 1,
          evidenceTypes: [MediaType.PHOTO],
        });

        await TaskActivity.create({
          taskId: microtask._id,
          actorId: leadUser._id,
          action: 'MICROTASK_CREATED',
          newValue: mItem.title,
        });
      }
    }
  }

  const weddingAttendees: Array<{
    name: string;
    email: string;
    phone: string;
    ticketCode: string;
    ticketType: 'General' | 'VIP' | 'Speaker' | 'Staff';
    status: 'registered' | 'checked_in';
  }> = [
    { name: 'Rohan Kulkarni', email: 'rohan.k@guest.in', phone: '+919822011001', ticketCode: 'EO-W101', ticketType: 'VIP', status: 'checked_in' },
    { name: 'Sneha Joshi', email: 'sneha.j@guest.in', phone: '+919822011002', ticketCode: 'EO-W102', ticketType: 'General', status: 'registered' },
    { name: 'Aarav Deshmukh', email: 'aarav.d@guest.in', phone: '+919822011003', ticketCode: 'EO-W103', ticketType: 'VIP', status: 'registered' },
    { name: 'Priya Verma', email: 'priya.v@guest.in', phone: '+919822011004', ticketCode: 'EO-W104', ticketType: 'General', status: 'registered' },
    { name: 'Kabir Malhotra', email: 'kabir.m@guest.in', phone: '+919822011005', ticketCode: 'EO-W105', ticketType: 'Speaker', status: 'checked_in' },
  ];

  for (const att of weddingAttendees) {
    await Attendee.create({
      eventId: weddingEvent._id,
      name: att.name,
      email: att.email,
      phone: att.phone,
      ticketCode: att.ticketCode,
      qrPayload: `EVENTOPS:${weddingEvent._id.toString()}:${att.ticketCode}`,
      ticketType: att.ticketType,
      status: att.status,
      ...(att.status === 'checked_in' ? { checkedInAt: new Date(), checkedInBy: manager._id } : {}),
    });
  }

  // Upcoming Corporate Summit Event
  const summitStart = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
  const summitEnd = new Date(summitStart.getTime() + 10 * 60 * 60 * 1000);
  const summitEvent = await Event.create({
    orgId: org._id,
    name: 'TechConnect 2026',
    type: 'corporate',
    venue: 'Amravati Convention Center',
    address: 'Exhibition Plaza, Amravati, Maharashtra',
    locationDetails: 'Hall B Registration Foyer & Main Auditorium',
    eventMode: 'hybrid',
    coverImage: '/images/events/corporate.svg',
    managerId: manager._id,
    startDate: summitStart,
    endDate: summitEnd,
    zones: ['Registration Desk', 'Main Auditorium', 'Expo Booths', 'Speaker Lounge'],
    status: 'live_setup',
    description: 'Annual regional summit on event tech, live engineering, and keynote sessions.',
    registrationConfig: {
      enabled: true,
      capacity: 600,
      requireApproval: false,
      checkInOpen: true,
      requirements: ['QR Badge Pass', 'Attendee Email Confirmation'],
    },
  });

  const summitTeam = await Team.create({
    eventId: summitEvent._id,
    name: 'Summit Venue & Hospitality',
    description: 'Keynote hall readiness, badge check-in kiosks, and VIP delegate catering',
    colorHex: '#6366F1',
    icon: 'Users',
    leadId: leadCatering._id,
    memberIds: [memberStage._id],
    isActive: true,
  });

  await ensureEventMembership(summitEvent._id, manager._id, EventRole.EVENT_MANAGER);
  await ensureEventMembership(summitEvent._id, leadCatering._id, EventRole.TEAM_LEAD, summitTeam._id);
  await ensureEventMembership(summitEvent._id, memberStage._id, EventRole.TEAM_MEMBER, summitTeam._id);

  const summitTasks = [
    { title: 'Book venue', status: TaskStatus.COMPLETED, offsetHours: 4, assigneeId: leadCatering._id },
    { title: 'Send invitations', status: TaskStatus.COMPLETED, offsetHours: 8, assigneeId: leadCatering._id },
    { title: 'Finalize catering', status: TaskStatus.IN_PROGRESS, offsetHours: 12, assigneeId: leadCatering._id },
    { title: 'Set up registration desk', status: TaskStatus.TO_DO, offsetHours: 16, assigneeId: memberStage._id },
  ];

  for (const sTask of summitTasks) {
    const dueTime = new Date(Date.now() + sTask.offsetHours * 60 * 60 * 1000);
    await Task.create({
      eventId: summitEvent._id,
      teamId: summitTeam._id,
      parentTaskId: null,
      title: sTask.title,
      description: `${sTask.title} for TechConnect 2026 at Amravati Convention Center.`,
      zone: 'Registration Desk',
      priority: TaskPriority.HIGH,
      status: sTask.status,
      assigneeId: sTask.assigneeId,
      creatorId: manager._id,
      dueTime,
      ...(sTask.status === TaskStatus.COMPLETED ? { completedAt: new Date() } : {}),
      evidenceRequired: false,
      minEvidenceCount: 0,
      evidenceTypes: [MediaType.PHOTO],
    });
  }

  const summitAttendees: Array<{
    name: string;
    email: string;
    phone: string;
    ticketCode: string;
    ticketType: 'General' | 'VIP' | 'Speaker' | 'Staff';
    status: 'registered' | 'checked_in';
  }> = [
    { name: 'Aniket Joshi', email: 'aniket.j@techconnect.in', phone: '+919822022001', ticketCode: 'TC-101', ticketType: 'Speaker', status: 'checked_in' },
    { name: 'Meera Nair', email: 'meera.n@techconnect.in', phone: '+919822022002', ticketCode: 'TC-102', ticketType: 'VIP', status: 'registered' },
    { name: 'Siddharth Rao', email: 'siddharth.r@techconnect.in', phone: '+919822022003', ticketCode: 'TC-103', ticketType: 'General', status: 'registered' },
    { name: 'Kavya Deshpande', email: 'kavya.d@techconnect.in', phone: '+919822022004', ticketCode: 'TC-104', ticketType: 'General', status: 'checked_in' },
  ];

  for (const att of summitAttendees) {
    await Attendee.create({
      eventId: summitEvent._id,
      name: att.name,
      email: att.email,
      phone: att.phone,
      ticketCode: att.ticketCode,
      qrPayload: `EVENTOPS:${summitEvent._id.toString()}:${att.ticketCode}`,
      ticketType: att.ticketType,
      status: att.status,
      ...(att.status === 'checked_in' ? { checkedInAt: new Date(), checkedInBy: manager._id } : {}),
    });
  }
}

/**
 * Ensures the three Instant Demo Login accounts and baseline demo events exist
 * idempotently so fresh browser or Docker Compose startups work out of the box
 * without clobbering existing user-created events.
 */
export async function ensureDemoData(): Promise<void> {
  const eventCount = await Event.countDocuments();
  const resetDemoPasswords = eventCount === 0;

  const manager = await upsertDemoUser(MANAGER_SPEC, resetDemoPasswords);
  const demoOrg = await resolveDemoOrganization(manager);
  await ensureOrgMembership(manager._id, demoOrg._id, OrgRole.OWNER);

  const leadCatering = await upsertDemoUser(
    { name: 'Chef Rajesh Sharma', email: 'lead.catering@royalweddings.com', preferredLanguage: 'en' },
    resetDemoPasswords
  );
  await ensureOrgMembership(leadCatering._id, demoOrg._id, OrgRole.MEMBER);

  const memberStage = await upsertDemoUser(
    { name: 'Manoj Shinde', email: 'member.stage@royalweddings.com', preferredLanguage: 'en' },
    resetDemoPasswords
  );
  await ensureOrgMembership(memberStage._id, demoOrg._id, OrgRole.MEMBER);

  if (eventCount === 0) {
    await seedDemoWorkspaceEvents(demoOrg, manager, leadCatering, memberStage);
    console.log('[Startup] Demo workspace seeded for Instant Demo Logins');
    return;
  }

  console.log('[Startup] Demo login accounts verified');
}

