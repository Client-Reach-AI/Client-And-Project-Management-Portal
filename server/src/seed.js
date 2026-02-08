import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { db } from './db/index.js';
import {
  users,
  workspaces,
  workspaceMembers,
  clients,
  clientIntakes,
  projects,
  projectMembers,
  tasks,
  comments,
  invitations,
} from './db/schema.js';

const now = new Date();
const daysAgo = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
};

const run = async () => {
  const adminPasswordHash = await bcrypt.hash('admin1234', 10);
  const memberPasswordHash = await bcrypt.hash('password123', 10);

  await db.delete(comments);
  await db.delete(tasks);
  await db.delete(projectMembers);
  await db.delete(invitations);
  await db.delete(projects);
  await db.delete(clientIntakes);
  await db.delete(clients);
  await db.delete(workspaceMembers);
  await db.delete(workspaces);
  await db.delete(users);

  await db.insert(users).values([
    {
      id: 'user_admin',
      name: 'Client Reach Admin',
      email: 'admin@clientreach.ai',
      image: null,
      role: 'ADMIN',
      password_hash: adminPasswordHash,
    },
    {
      id: 'user_maya',
      name: 'Maya Brooks',
      email: 'maya@clientreach.ai',
      image: null,
      role: 'USER',
      password_hash: memberPasswordHash,
    },
    {
      id: 'user_noah',
      name: 'Noah Reed',
      email: 'noah@clientreach.ai',
      image: null,
      role: 'USER',
      password_hash: memberPasswordHash,
    },
    {
      id: 'user_priya',
      name: 'Priya Desai',
      email: 'priya@clientreach.ai',
      image: null,
      role: 'USER',
      password_hash: memberPasswordHash,
    },
    {
      id: 'user_omar',
      name: 'Omar Farid',
      email: 'omar@clientreach.ai',
      image: null,
      role: 'USER',
      password_hash: memberPasswordHash,
    },
    {
      id: 'user_lina',
      name: 'Lina Scott',
      email: 'lina@clientreach.ai',
      image: null,
      role: 'USER',
      password_hash: memberPasswordHash,
    },
    {
      id: 'user_steve',
      name: 'Steve Harper',
      email: 'steve@clientreach.ai',
      image: null,
      role: 'USER',
      password_hash: memberPasswordHash,
    },
    {
      id: 'user_zoe',
      name: 'Zoe King',
      email: 'zoe@clientreach.ai',
      image: null,
      role: 'USER',
      password_hash: memberPasswordHash,
    },
  ]);

  await db.insert(workspaces).values([
    {
      id: 'org_core',
      name: 'Client Reach AI - Core Platform',
      slug: 'client-reach-core',
      description: 'Core product roadmap and delivery for Client Reach AI.',
      settings: { theme: 'midnight' },
      ownerId: 'user_admin',
      image_url: null,
    },
    {
      id: 'org_marketing',
      name: 'Client Reach AI - Marketing',
      slug: 'client-reach-marketing',
      description: 'Marketing campaigns, web presence, and growth experiments.',
      settings: { theme: 'sunrise' },
      ownerId: 'user_admin',
      image_url: null,
    },
    {
      id: 'org_delivery',
      name: 'Client Reach AI - Client Delivery',
      slug: 'client-reach-delivery',
      description: 'Client projects across mobile apps, web, and AI workflows.',
      settings: { theme: 'forest' },
      ownerId: 'user_admin',
      image_url: null,
    },
    {
      id: 'org_internal',
      name: 'Client Reach AI - Internal Ops',
      slug: 'client-reach-ops',
      description: 'Internal automation, IT, and operational tooling.',
      settings: { theme: 'marine' },
      ownerId: 'user_admin',
      image_url: null,
    },
  ]);

  await db.insert(workspaceMembers).values([
    {
      id: 'wm_core_admin',
      workspaceId: 'org_core',
      userId: 'user_admin',
      role: 'ADMIN',
      message: '',
    },
    {
      id: 'wm_core_maya',
      workspaceId: 'org_core',
      userId: 'user_maya',
      role: 'ADMIN',
      message: 'Platform lead',
    },
    {
      id: 'wm_core_noah',
      workspaceId: 'org_core',
      userId: 'user_noah',
      role: 'MEMBER',
      message: 'Mobile lead',
    },
    {
      id: 'wm_core_priya',
      workspaceId: 'org_core',
      userId: 'user_priya',
      role: 'MEMBER',
      message: 'AI workflows',
    },
    {
      id: 'wm_marketing_admin',
      workspaceId: 'org_marketing',
      userId: 'user_admin',
      role: 'ADMIN',
      message: '',
    },
    {
      id: 'wm_marketing_omar',
      workspaceId: 'org_marketing',
      userId: 'user_omar',
      role: 'ADMIN',
      message: 'Marketing lead',
    },
    {
      id: 'wm_marketing_lina',
      workspaceId: 'org_marketing',
      userId: 'user_lina',
      role: 'MEMBER',
      message: 'Content strategist',
    },
    {
      id: 'wm_delivery_admin',
      workspaceId: 'org_delivery',
      userId: 'user_admin',
      role: 'ADMIN',
      message: '',
    },
    {
      id: 'wm_delivery_steve',
      workspaceId: 'org_delivery',
      userId: 'user_steve',
      role: 'ADMIN',
      message: 'Delivery manager',
    },
    {
      id: 'wm_delivery_zoe',
      workspaceId: 'org_delivery',
      userId: 'user_zoe',
      role: 'MEMBER',
      message: 'Project coordinator',
    },
    {
      id: 'wm_ops_admin',
      workspaceId: 'org_internal',
      userId: 'user_admin',
      role: 'ADMIN',
      message: '',
    },
    {
      id: 'wm_ops_priya',
      workspaceId: 'org_internal',
      userId: 'user_priya',
      role: 'ADMIN',
      message: 'Automation lead',
    },
  ]);

  await db.insert(clients).values([
    {
      id: 'client_skycart',
      workspaceId: 'org_delivery',
      name: 'SkyCart',
      company: 'SkyCart Commerce',
      email: 'ops@skycart.com',
      phone: '+1 415 555 3101',
      website: 'https://skycart.com',
      industry: 'E-commerce',
      status: 'ACTIVE',
      details: {
        source: 'MANUAL',
        contactName: 'Alicia Ross',
        goals: 'Mobile app redesign and checkout optimization',
        budget: '$40k',
        timeline: '10 weeks',
        targetAudience: 'Mobile shoppers',
        brandGuidelines: 'Modern, high-conversion',
        competitors: 'FastBuy, ShopFlow',
        successMetrics: 'Increase mobile conversion by 15%',
        notes: 'Add one-click checkout.',
      },
      updatedAt: now,
    },
    {
      id: 'client_horizon',
      workspaceId: 'org_delivery',
      name: 'Horizon Health',
      company: 'Horizon Health',
      email: 'care@horizonhealth.com',
      phone: '+1 646 555 2102',
      website: 'https://horizonhealth.com',
      industry: 'Healthcare',
      status: 'ACTIVE',
      details: {
        source: 'MANUAL',
        contactName: 'Liam Ortega',
        goals: 'AI triage workflow automation',
        budget: '$55k',
        timeline: '12 weeks',
        targetAudience: 'Care coordinators',
        brandGuidelines: 'Accessible, trustworthy',
        competitors: 'CarePilot',
        successMetrics: 'Reduce response time by 30%',
        notes: 'HIPAA compliance required.',
      },
      updatedAt: now,
    },
    {
      id: 'client_orbitai',
      workspaceId: 'org_core',
      name: 'OrbitAI',
      company: 'OrbitAI',
      contactName: 'Isabella Grant',
      contactRole: 'Operations Lead',
      email: 'hello@orbitai.io',
      phone: '+1 312 555 2204',
      website: 'https://orbitai.io',
      industry: 'AI SaaS',
      serviceType: 'ai_automation',
      businessDetails: {
        problem_solving:
          'Manual onboarding is slow and inconsistent across teams.',
        success_90_days:
          'Automate 60% of onboarding tasks and cut setup time by 25%.',
        launch_date: '2026-04-15',
        biggest_concern: 'Data accuracy during workflow automation.',
      },
      serviceResponses: {
        tasks: 'Provisioning accounts, syncing data, and notifying teams.',
        tools: 'HubSpot, Slack, Airtable',
        volume: '100-500',
        workflow:
          'Automated handoffs from sales to onboarding with status updates.',
      },
      uploadedFiles: [
        {
          name: 'onboarding-process.pdf',
          size: 410240,
          type: 'application/pdf',
          url: '#',
        },
      ],
      calendlyEventId: 'cal_evt_orbitai',
      status: 'ACTIVE',
      details: {
        source: 'INTAKE',
        intakeId: 'intake_orbitai',
        serviceType: 'ai_automation',
        contactRole: 'Operations Lead',
        businessDetails: {
          problem_solving:
            'Manual onboarding is slow and inconsistent across teams.',
          success_90_days:
            'Automate 60% of onboarding tasks and cut setup time by 25%.',
          launch_date: '2026-04-15',
          biggest_concern: 'Data accuracy during workflow automation.',
        },
        serviceResponses: {
          tasks: 'Provisioning accounts, syncing data, and notifying teams.',
          tools: 'HubSpot, Slack, Airtable',
          volume: '100-500',
          workflow:
            'Automated handoffs from sales to onboarding with status updates.',
        },
        uploadedFiles: [
          {
            name: 'onboarding-process.pdf',
            size: 410240,
            type: 'application/pdf',
            url: '#',
          },
        ],
        calendlyEventId: 'cal_evt_orbitai',
        goals: 'New onboarding workflow automation',
        budget: '$28k',
        timeline: '6 weeks',
        targetAudience: 'Ops leaders',
        brandGuidelines: 'Clean, data-first',
        competitors: 'FlowOps',
        successMetrics: 'Reduce onboarding time by 25%',
        notes: 'Integrate with Zapier.',
      },
      updatedAt: now,
    },
    {
      id: 'client_glow',
      workspaceId: 'org_marketing',
      name: 'Glow Fitness',
      company: 'Glow Fitness',
      email: 'marketing@glowfit.com',
      phone: '+1 212 555 8801',
      website: 'https://glowfit.com',
      industry: 'Fitness',
      status: 'ACTIVE',
      details: {
        source: 'MANUAL',
        contactName: 'Rachel Kim',
        goals: 'Website refresh and campaign landing pages',
        budget: '$18k',
        timeline: '5 weeks',
        targetAudience: 'New subscribers',
        brandGuidelines: 'Energetic, bold',
        competitors: 'FitNow',
        successMetrics: 'Increase lead conversion 20%',
        notes: 'Include testimonial carousel.',
      },
      updatedAt: now,
    },
  ]);

  await db.insert(clientIntakes).values([
    {
      id: 'intake_orbitai',
      workspaceId: 'org_core',
      clientId: 'client_orbitai',
      token: 'token_orbitai',
      status: 'SUBMITTED',
      serviceType: 'ai_automation',
      companyName: 'OrbitAI',
      contactName: 'Isabella Grant',
      contactRole: 'Operations Lead',
      industry: 'AI SaaS',
      businessDetails: {
        problem_solving:
          'Manual onboarding is slow and inconsistent across teams.',
        success_90_days:
          'Automate 60% of onboarding tasks and cut setup time by 25%.',
        launch_date: '2026-04-15',
        biggest_concern: 'Data accuracy during workflow automation.',
      },
      serviceResponses: {
        tasks: 'Provisioning accounts, syncing data, and notifying teams.',
        tools: 'HubSpot, Slack, Airtable',
        volume: '100-500',
        workflow:
          'Automated handoffs from sales to onboarding with status updates.',
      },
      uploadedFiles: [
        {
          name: 'onboarding-process.pdf',
          size: 410240,
          type: 'application/pdf',
          url: '#',
        },
      ],
      calendlyEventId: 'cal_evt_orbitai',
      payload: {
        service_type: 'ai_automation',
        company_name: 'OrbitAI',
        contact_name: 'Isabella Grant',
        contact_role: 'Operations Lead',
        industry: 'AI SaaS',
        business_details: {
          problem_solving:
            'Manual onboarding is slow and inconsistent across teams.',
          success_90_days:
            'Automate 60% of onboarding tasks and cut setup time by 25%.',
          launch_date: '2026-04-15',
          biggest_concern: 'Data accuracy during workflow automation.',
        },
        service_responses: {
          tasks: 'Provisioning accounts, syncing data, and notifying teams.',
          tools: 'HubSpot, Slack, Airtable',
          volume: '100-500',
          workflow:
            'Automated handoffs from sales to onboarding with status updates.',
        },
        uploaded_files: [
          {
            name: 'onboarding-process.pdf',
            size: 410240,
            type: 'application/pdf',
            url: '#',
          },
        ],
        calendly_event_id: 'cal_evt_orbitai',
      },
      expiresAt: daysAgo(-10),
      submittedAt: daysAgo(2),
      createdAt: daysAgo(8),
    },
    {
      id: 'intake_open_marketing',
      workspaceId: 'org_marketing',
      clientId: null,
      token: 'token_marketing_open',
      status: 'OPEN',
      payload: {},
      expiresAt: daysAgo(-3),
      submittedAt: null,
      createdAt: daysAgo(1),
    },
  ]);

  await db.insert(projects).values([
    {
      id: 'project_skycart_mobile',
      workspaceId: 'org_delivery',
      clientId: 'client_skycart',
      name: 'SkyCart Mobile Commerce',
      description: 'Build a new mobile app experience with fast checkout.',
      priority: 'HIGH',
      status: 'ACTIVE',
      start_date: daysAgo(20),
      end_date: daysAgo(-40),
      team_lead: 'user_noah',
      progress: 45,
      updatedAt: now,
    },
    {
      id: 'project_horizon_workflows',
      workspaceId: 'org_delivery',
      clientId: 'client_horizon',
      name: 'Horizon AI Triage',
      description: 'Automate triage workflows and dashboards.',
      priority: 'HIGH',
      status: 'ACTIVE',
      start_date: daysAgo(25),
      end_date: daysAgo(-50),
      team_lead: 'user_priya',
      progress: 35,
      updatedAt: now,
    },
    {
      id: 'project_orbit_onboarding',
      workspaceId: 'org_core',
      clientId: 'client_orbitai',
      name: 'OrbitAI Onboarding Automation',
      description: 'Design onboarding workflows with integrations.',
      priority: 'MEDIUM',
      status: 'ACTIVE',
      start_date: daysAgo(30),
      end_date: daysAgo(-20),
      team_lead: 'user_maya',
      progress: 60,
      updatedAt: now,
    },
    {
      id: 'project_marketing_site',
      workspaceId: 'org_marketing',
      clientId: 'client_glow',
      name: 'Glow Fitness Marketing Site',
      description: 'Launch new marketing website and campaign pages.',
      priority: 'MEDIUM',
      status: 'ACTIVE',
      start_date: daysAgo(18),
      end_date: daysAgo(-25),
      team_lead: 'user_omar',
      progress: 50,
      updatedAt: now,
    },
  ]);

  await db.insert(invitations).values([
    {
      id: 'invite_global_admin',
      email: 'global.admin@clientreach.ai',
      token: 'token_global_admin',
      role: 'GLOBAL_ADMIN',
      workspaceId: 'org_core',
      projectId: null,
      invitedBy: 'user_admin',
      expiresAt: daysAgo(-7),
      acceptedAt: null,
      createdAt: daysAgo(1),
    },
    {
      id: 'invite_workspace_admin',
      email: 'marketing.admin@clientreach.ai',
      token: 'token_workspace_admin',
      role: 'ADMIN',
      workspaceId: 'org_marketing',
      projectId: null,
      invitedBy: 'user_admin',
      expiresAt: daysAgo(-7),
      acceptedAt: null,
      createdAt: daysAgo(1),
    },
    {
      id: 'invite_member',
      email: 'delivery.member@clientreach.ai',
      token: 'token_member',
      role: 'MEMBER',
      workspaceId: 'org_delivery',
      projectId: 'project_skycart_mobile',
      invitedBy: 'user_admin',
      expiresAt: daysAgo(-7),
      acceptedAt: null,
      createdAt: daysAgo(1),
    },
  ]);

  await db.insert(projectMembers).values([
    {
      id: 'pm_skycart_admin',
      projectId: 'project_skycart_mobile',
      userId: 'user_admin',
    },
    {
      id: 'pm_skycart_noah',
      projectId: 'project_skycart_mobile',
      userId: 'user_noah',
    },
    {
      id: 'pm_skycart_zoe',
      projectId: 'project_skycart_mobile',
      userId: 'user_zoe',
    },
    {
      id: 'pm_horizon_admin',
      projectId: 'project_horizon_workflows',
      userId: 'user_admin',
    },
    {
      id: 'pm_horizon_priya',
      projectId: 'project_horizon_workflows',
      userId: 'user_priya',
    },
    {
      id: 'pm_horizon_steve',
      projectId: 'project_horizon_workflows',
      userId: 'user_steve',
    },
    {
      id: 'pm_orbit_admin',
      projectId: 'project_orbit_onboarding',
      userId: 'user_admin',
    },
    {
      id: 'pm_orbit_maya',
      projectId: 'project_orbit_onboarding',
      userId: 'user_maya',
    },
    {
      id: 'pm_orbit_lina',
      projectId: 'project_orbit_onboarding',
      userId: 'user_lina',
    },
    {
      id: 'pm_glow_admin',
      projectId: 'project_marketing_site',
      userId: 'user_admin',
    },
    {
      id: 'pm_glow_omar',
      projectId: 'project_marketing_site',
      userId: 'user_omar',
    },
    {
      id: 'pm_glow_lina',
      projectId: 'project_marketing_site',
      userId: 'user_lina',
    },
  ]);

  await db.insert(tasks).values([
    {
      id: 'task_skycart_1',
      projectId: 'project_skycart_mobile',
      title: 'Define mobile IA',
      description: 'Finalize navigation and key shopping flows.',
      status: 'IN_PROGRESS',
      type: 'PLANNING',
      priority: 'HIGH',
      assigneeId: 'user_zoe',
      due_date: daysAgo(-7),
      updatedAt: now,
    },
    {
      id: 'task_skycart_2',
      projectId: 'project_skycart_mobile',
      title: 'Checkout performance audit',
      description: 'Benchmark current checkout speed and errors.',
      status: 'TODO',
      type: 'TASK',
      priority: 'MEDIUM',
      assigneeId: 'user_noah',
      due_date: daysAgo(-10),
      updatedAt: now,
    },
    {
      id: 'task_horizon_1',
      projectId: 'project_horizon_workflows',
      title: 'Triage model requirements',
      description: 'Define model inputs and escalation rules.',
      status: 'IN_PROGRESS',
      type: 'FEATURE',
      priority: 'HIGH',
      assigneeId: 'user_priya',
      due_date: daysAgo(-6),
      updatedAt: now,
    },
    {
      id: 'task_horizon_2',
      projectId: 'project_horizon_workflows',
      title: 'Workflow analytics dashboard',
      description: 'Draft KPI dashboard layout.',
      status: 'TODO',
      type: 'DESIGN',
      priority: 'MEDIUM',
      assigneeId: 'user_steve',
      due_date: daysAgo(-12),
      updatedAt: now,
    },
    {
      id: 'task_orbit_1',
      projectId: 'project_orbit_onboarding',
      title: 'Integration mapping',
      description: 'Map key systems and data sync flows.',
      status: 'DONE',
      type: 'TASK',
      priority: 'MEDIUM',
      assigneeId: 'user_maya',
      due_date: daysAgo(2),
      updatedAt: now,
    },
    {
      id: 'task_orbit_2',
      projectId: 'project_orbit_onboarding',
      title: 'Onboarding email templates',
      description: 'Create template set for onboarding.',
      status: 'IN_PROGRESS',
      type: 'DOCS',
      priority: 'LOW',
      assigneeId: 'user_lina',
      due_date: daysAgo(-5),
      updatedAt: now,
    },
    {
      id: 'task_glow_1',
      projectId: 'project_marketing_site',
      title: 'Landing page wireframes',
      description: 'Homepage and lead capture flow.',
      status: 'IN_PROGRESS',
      type: 'DESIGN',
      priority: 'MEDIUM',
      assigneeId: 'user_omar',
      due_date: daysAgo(-8),
      updatedAt: now,
    },
    {
      id: 'task_glow_2',
      projectId: 'project_marketing_site',
      title: 'Campaign copy draft',
      description: 'Write messaging for paid campaign.',
      status: 'TODO',
      type: 'DOCS',
      priority: 'LOW',
      assigneeId: 'user_lina',
      due_date: daysAgo(-13),
      updatedAt: now,
    },
  ]);

  await db.insert(comments).values([
    {
      id: 'comment_skycart_1',
      taskId: 'task_skycart_1',
      userId: 'user_admin',
      content: 'Let’s highlight Apple Pay and Shop Pay in the flow.',
      createdAt: daysAgo(3),
    },
    {
      id: 'comment_horizon_1',
      taskId: 'task_horizon_1',
      userId: 'user_priya',
      content: 'Need to confirm data retention with compliance.',
      createdAt: daysAgo(2),
    },
    {
      id: 'comment_glow_1',
      taskId: 'task_glow_1',
      userId: 'user_omar',
      content: 'Wireframes ready for internal review.',
      createdAt: daysAgo(1),
    },
  ]);
};

run()
  .then(() => {
    console.log('Seed complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
