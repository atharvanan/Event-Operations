import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { User } from '../src/models/User.js';
import { Organization } from '../src/models/Organization.js';
import { OrganizationMembership } from '../src/models/OrganizationMembership.js';
import { Event } from '../src/models/Event.js';
import { EventMembership } from '../src/models/EventMembership.js';
import { Team } from '../src/models/Team.js';
import { Task } from '../src/models/Task.js';
import { TaskActivity } from '../src/models/TaskActivity.js';
import { Conversation } from '../src/models/Conversation.js';
import { Attendee } from '../src/models/Attendee.js';
import { EventResource } from '../src/models/EventResource.js';
import { OrgRole, EventRole, TaskStatus, TaskPriority, ConversationType } from '../src/constants/index.js';

export const seedDatabase = async () => {
  console.log('[Seed] Starting database seeding...');
  await connectDB();

  // Clear existing collections
  await Promise.all([
    User.deleteMany({}),
    Organization.deleteMany({}),
    OrganizationMembership.deleteMany({}),
    Event.deleteMany({}),
    EventMembership.deleteMany({}),
    Team.deleteMany({}),
    Task.deleteMany({}),
    TaskActivity.deleteMany({}),
    Conversation.deleteMany({}),
    Attendee.deleteMany({}),
    EventResource.deleteMany({}),
  ]);

  console.log('[Seed] Cleared existing records.');

  // 1. Create Organization Owner / Event Manager
  const manager = await User.create({
    name: 'Vikram Sethi',
    email: 'manager@royalweddings.com',
    password: 'Password@123',
    phone: '+919876500001',
    preferredLanguage: 'hi',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
  });

  const org = await Organization.create({
    name: 'Royal Heritage Weddings & Events',
    slug: 'royal-heritage-weddings',
    ownerId: manager._id,
  });

  await OrganizationMembership.create({
    userId: manager._id,
    orgId: org._id,
    role: OrgRole.OWNER,
  });

  // 2. Create Events
  const weddingEvent = await Event.create({
    orgId: org._id,
    name: 'The Grand Heritage Palace Wedding & Sangeet',
    type: 'wedding',
    venue: 'Umaid Heritage Palace Grounds, Jaipur',
    address: 'Palace Road, Circuit House Circle, Jaipur, Rajasthan',
    locationDetails: 'Main Gate A for Vendors; Royal Courtyard for Guests',
    eventMode: 'in_person',
    registrationConfig: {
      enabled: true,
      capacity: 800,
      requireApproval: false,
      checkInOpen: true,
      requirements: ['QR Invitation Pass', 'Photo ID at VIP Gate'],
    },
    managerId: manager._id,
    startDate: new Date('2026-12-15T10:00:00.000Z'),
    endDate: new Date('2026-12-16T04:00:00.000Z'),
    zones: ['Main Stage & Mandap', 'Royal Dining Lawns', 'Welcome Arch & Courtyard', 'VIP Hospitality Lounge', 'Sound Control Deck'],
    status: 'in_progress',
    description: 'Luxury destination wedding for 800 guests featuring royal sangeet, live food stations, multi-tier floral mandap, and high-tech AV production.',
    permissions: {
      allowWorkersGlobalChat: true,
      allowWorkersTeamChat: true,
      requireLeadReviewFirst: true,
      allowLeadTaskCreation: true,
      allowWorkerSelfAssignment: false,
    },
  });

  await EventMembership.create({
    eventId: weddingEvent._id,
    userId: manager._id,
    role: EventRole.EVENT_MANAGER,
  });

  // Global Event Chat
  const globalChat = await Conversation.create({
    eventId: weddingEvent._id,
    type: ConversationType.GLOBAL_EVENT,
    title: 'The Grand Heritage Palace Wedding — All-Hands Ops',
    participantIds: [manager._id],
  });

  // 3. Define 5 Operational Teams with Leads and Workers
  const teamsData = [
    {
      name: 'Catering & Hospitality',
      description: '8 buffet stations, 4 live chaat counters, royal dessert bar, and dinner service',
      colorHex: '#10B981',
      icon: 'Utensils',
      lead: { name: 'Chef Rajesh Sharma', email: 'lead.catering@royalweddings.com', lang: 'hi' },
      workers: [
        { name: 'Sunil Kumar', email: 'worker.catering1@royalweddings.com', lang: 'hi' },
        { name: 'Amit Verma', email: 'worker.catering2@royalweddings.com', lang: 'en' },
      ],
      tasks: [
        {
          title: 'Buffet Stations & Chafing Dishes Setup',
          description: 'Deploy 8 chafing counters with table warmers, cutlery, and clean velvet table linen in Dining Lawn A',
          zone: 'Royal Dining Lawns',
          priority: TaskPriority.HIGH,
          offsetHours: 2,
          status: TaskStatus.IN_PROGRESS,
          microtasks: [
            { title: 'Sterno fuel cans and brass chafing dishes placement', assigneeIdx: 0, status: TaskStatus.COMPLETED },
            { title: 'Plate stacks, soup bowls, and dinner cutlery replenishment', assigneeIdx: 1, status: TaskStatus.IN_PROGRESS },
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
      lead: { name: 'Pooja Patil', email: 'lead.decor@royalweddings.com', lang: 'mr' },
      workers: [
        { name: 'Manoj Shinde', email: 'member.stage@royalweddings.com', lang: 'mr' },
        { name: 'Suresh Patil', email: 'worker.decor1@royalweddings.com', lang: 'mr' },
      ],
      tasks: [
        {
          title: 'Mandap Structural Framework & Floral Arch',
          description: 'Construct four carved pillars with marigold and red rose drapery. Verify anchoring with safety lead.',
          zone: 'Main Stage & Mandap',
          priority: TaskPriority.CRITICAL,
          offsetHours: 1,
          status: TaskStatus.SUBMITTED_FOR_REVIEW,
          microtasks: [
            { title: 'Pillar alignment and safety weight tie-down', assigneeIdx: 0, status: TaskStatus.COMPLETED },
          ],
        },
      ],
    },
    {
      name: 'Lights & Audio-Visual',
      description: 'Overhead stage truss, LED video walls, beam lights, wireless microphones, and DJ console',
      colorHex: '#3B82F6',
      icon: 'Music',
      lead: { name: 'Rohan Deshmukh', email: 'lead.av@royalweddings.com', lang: 'mr' },
      workers: [
        { name: 'Rahul Joshi', email: 'worker.av1@royalweddings.com', lang: 'mr' },
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
            { title: 'Screen panel lock and HDMI matrix testing', assigneeIdx: 0, status: TaskStatus.IN_PROGRESS },
          ],
        },
      ],
    },
    {
      name: 'Camera & Photography',
      description: 'Live broadcast jib, 4 roving candid photographers, drone pilots, and live stream feed',
      colorHex: '#8B5CF6',
      icon: 'Camera',
      lead: { name: 'Ananya Sen', email: 'lead.camera@royalweddings.com', lang: 'en' },
      workers: [
        { name: 'Deepak Roy', email: 'worker.camera1@royalweddings.com', lang: 'en' },
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
      lead: { name: 'Sanjay Gupta', email: 'lead.logistics@royalweddings.com', lang: 'hi' },
      workers: [
        { name: 'Neha Rathi', email: 'worker.logistics1@royalweddings.com', lang: 'hi' },
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

  for (const tData of teamsData) {
    // Create Lead User
    const leadUser = await User.create({
      name: tData.lead.name,
      email: tData.lead.email,
      password: 'Password@123',
      preferredLanguage: tData.lead.lang as any,
    });

    await OrganizationMembership.create({
      userId: leadUser._id,
      orgId: org._id,
      role: OrgRole.MEMBER,
    });

    // Create Workers
    const workerUsers = [];
    for (const w of tData.workers) {
      const workerUser = await User.create({
        name: w.name,
        email: w.email,
        password: 'Password@123',
        preferredLanguage: w.lang as any,
      });

      await OrganizationMembership.create({
        userId: workerUser._id,
        orgId: org._id,
        role: OrgRole.MEMBER,
      });

      workerUsers.push(workerUser);
    }

    // Create Team
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

    // Event Membership for Lead & Workers
    await EventMembership.create({
      eventId: weddingEvent._id,
      userId: leadUser._id,
      role: EventRole.TEAM_LEAD,
      teamId: team._id,
    });

    for (const w of workerUsers) {
      await EventMembership.create({
        eventId: weddingEvent._id,
        userId: w._id,
        role: EventRole.TEAM_MEMBER,
        teamId: team._id,
      });
    }

    // Add all to global chat
    await Conversation.updateOne(
      { _id: globalChat._id },
      { $addToSet: { participantIds: { $each: [leadUser._id, ...workerUsers.map((w) => w._id)] } } }
    );

    // Create Team Internal Chat
    await Conversation.create({
      eventId: weddingEvent._id,
      type: ConversationType.TEAM_INTERNAL,
      teamId: team._id,
      title: `${tData.name} Team Comms`,
      participantIds: [leadUser._id, ...workerUsers.map((w) => w._id)],
    });

    // Create Manager-Team Coordination Chat
    await Conversation.create({
      eventId: weddingEvent._id,
      type: ConversationType.MANAGER_TEAM,
      teamId: team._id,
      title: `${tData.name} ↔ Manager Channel`,
      participantIds: [manager._id, leadUser._id, ...workerUsers.map((w) => w._id)],
    });

    // Create Parent Tasks and Microtasks
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
        evidenceTypes: ['PHOTO'],
      });

      await TaskActivity.create({
        taskId: parentTask._id,
        actorId: manager._id,
        action: 'PARENT_TASK_CREATED',
        newValue: taskItem.title,
      });

      // Create Microtasks
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
          evidenceTypes: ['PHOTO'],
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

  // Seed Attendees for Wedding Event
  const weddingAttendees = [
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

  // Upcoming Summit Event (3 days out)
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

  await EventMembership.create({
    eventId: summitEvent._id,
    userId: manager._id,
    role: EventRole.EVENT_MANAGER,
  });

  await Conversation.create({
    eventId: summitEvent._id,
    type: ConversationType.GLOBAL_EVENT,
    title: 'TechConnect 2026 - All Hands Ops',
    participantIds: [manager._id],
  });

  const summitRegTeam = await Team.create({
    eventId: summitEvent._id,
    name: 'Venue & Guest Registration',
    description: 'Front desk badge scanning, venue staging, and AV check',
    colorHex: '#43328E',
    icon: 'Users',
    leadId: manager._id,
    memberIds: [],
    isActive: true,
  });

  const summitTaskTitles = [
    { title: 'Book venue', status: TaskStatus.COMPLETED, offsetDays: -1 },
    { title: 'Send invitations', status: TaskStatus.COMPLETED, offsetDays: 0 },
    { title: 'Finalize catering', status: TaskStatus.IN_PROGRESS, offsetDays: 1 },
    { title: 'Set up registration desk', status: TaskStatus.TO_DO, offsetDays: 2 },
  ];

  for (const st of summitTaskTitles) {
    const due = new Date(Date.now() + st.offsetDays * 24 * 60 * 60 * 1000);
    await Task.create({
      eventId: summitEvent._id,
      teamId: summitRegTeam._id,
      parentTaskId: null,
      title: st.title,
      description: `Operational checklist step: ${st.title}`,
      zone: 'Registration Desk',
      priority: st.status === TaskStatus.TO_DO ? TaskPriority.HIGH : TaskPriority.MEDIUM,
      status: st.status,
      assigneeId: manager._id,
      creatorId: manager._id,
      dueTime: due,
      evidenceRequired: false,
      minEvidenceCount: 0,
      evidenceTypes: ['PHOTO'],
    });
  }

  for (let i = 1; i <= 4; i++) {
    const code = `TC-10${i}`;
    await Attendee.create({
      eventId: summitEvent._id,
      name: ['Meera Deshpande', 'Siddharth Kulkarni', 'Nandini Rao', 'Karan Mehta'][i - 1],
      email: `attendee${i}@techconnect.in`,
      ticketCode: code,
      qrPayload: `EVENTOPS:${summitEvent._id.toString()}:${code}`,
      ticketType: i === 1 ? 'Speaker' : i === 2 ? 'VIP' : 'General',
      status: i === 4 ? 'checked_in' : 'registered',
      ...(i === 4 ? { checkedInAt: new Date(), checkedInBy: manager._id } : {}),
    });
  }

  console.log('[Seed] Database seeded with 2 Events, 5+ Teams, Attendees with QR Passes, and Operational Checklists!');
  await disconnectDB();
};

if (!process.env.VITEST) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[Seed] Error seeding database:', err);
      process.exit(1);
    });
}

