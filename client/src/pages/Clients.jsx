import { useMemo, useState } from 'react';
import { Link as LinkIcon, Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSelector } from 'react-redux';
import { useWorkspaceContext } from '../context/workspaceContext';
import { useClientIntakes, useClients } from '../hooks/useQueries';
import { useCreateClient, useCreateClientIntake } from '../hooks/useMutations';
import CreateProjectDialog from '../components/CreateProjectDialog';

const initialClientForm = {
  name: '',
  company: '',
  email: '',
  phone: '',
  website: '',
  industry: '',
  contactName: '',
  address: '',
  goals: '',
  budget: '',
  timeline: '',
  targetAudience: '',
  brandGuidelines: '',
  competitors: '',
  successMetrics: '',
  notes: '',
};

const getIntakeDisplayName = (payload = {}) =>
  payload.contact_name ||
  payload.clientName ||
  payload.company_name ||
  payload.company ||
  'Client Submission';

const getServiceLabel = (serviceType) => {
  switch (serviceType) {
    case 'website_build':
      return 'Website Build';
    case 'ai_receptionist':
      return 'AI Receptionist';
    case 'ai_automation':
      return 'AI Automation';
    case 'software_build':
      return 'Software Build';
    default:
      return 'Service';
  }
};

const buildServiceSummary = (payload = {}) => {
  const serviceType = payload.service_type;
  const responses = payload.service_responses || {};

  if (serviceType === 'website_build') {
    const features = (responses.features || []).join(', ');
    return [
      responses.has_site && `Has site: ${responses.has_site}`,
      responses.current_url && `Current URL: ${responses.current_url}`,
      features && `Features: ${features}`,
      responses.style && `Style: ${responses.style}`,
    ]
      .filter(Boolean)
      .join('\n');
  }

  if (serviceType === 'ai_receptionist') {
    const dataPoints = (responses.data_points || []).join(', ');
    return [
      responses.daily_calls && `Daily calls: ${responses.daily_calls}`,
      responses.frustration && `Frustration: ${responses.frustration}`,
      dataPoints && `Info to collect: ${dataPoints}`,
      responses.forward_phone && `Forward phone: ${responses.forward_phone}`,
    ]
      .filter(Boolean)
      .join('\n');
  }

  if (serviceType === 'ai_automation') {
    return [
      responses.tasks && `Tasks: ${responses.tasks}`,
      responses.tools && `Tools: ${responses.tools}`,
      responses.volume && `Volume: ${responses.volume}`,
      responses.workflow && `Workflow: ${responses.workflow}`,
    ]
      .filter(Boolean)
      .join('\n');
  }

  if (serviceType === 'software_build') {
    return [
      responses.sw_type && `Type: ${responses.sw_type}`,
      responses.problem && `Problem: ${responses.problem}`,
      responses.sw_features && `Features: ${responses.sw_features}`,
    ]
      .filter(Boolean)
      .join('\n');
  }

  return '';
};

const Clients = () => {
  const { currentWorkspace, searchQuery } = useWorkspaceContext();
  const user = useSelector((state) => state.auth.user);
  const memberRole = currentWorkspace?.members?.find(
    (m) => m.user.id === user?.id
  )?.role;
  const isAdmin = user?.role === 'ADMIN' || memberRole === 'ADMIN';

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState(initialClientForm);
  const [selectedIntake, setSelectedIntake] = useState(null);
  const [showProjectDialog, setShowProjectDialog] = useState(false);
  const [selectedDetails, setSelectedDetails] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('name-asc');

  const { data: clients = [] } = useClients(currentWorkspace?.id);
  const { data: intakes = [] } = useClientIntakes(currentWorkspace?.id);
  const { mutateAsync: createClient, isPending } = useCreateClient();
  const { mutateAsync: createIntake, isPending: intakePending } =
    useCreateClientIntake();

  const intakeList = useMemo(
    () => intakes.filter((item) => item.status === 'SUBMITTED'),
    [intakes]
  );

  const filteredClients = useMemo(() => {
    const normalized = searchQuery.trim().toLowerCase();
    let list = [...clients];

    if (statusFilter !== 'ALL') {
      list = list.filter((client) => client.status === statusFilter);
    }

    if (normalized) {
      list = list.filter((client) => {
        const target = [
          client.name,
          client.company,
          client.email,
          client.phone,
          client.website,
          client.industry,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return target.includes(normalized);
      });
    }

    switch (sortBy) {
      case 'name-desc':
        list.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'company-asc':
        list.sort((a, b) => (a.company || '').localeCompare(b.company || ''));
        break;
      case 'company-desc':
        list.sort((a, b) => (b.company || '').localeCompare(a.company || ''));
        break;
      default:
        list.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }

    return list;
  }, [clients, searchQuery, statusFilter, sortBy]);

  const handleCreateClient = async (event) => {
    event.preventDefault();
    if (!currentWorkspace?.id) return;

    try {
      await createClient({
        workspaceId: currentWorkspace.id,
        name: formData.name,
        company: formData.company,
        email: formData.email,
        phone: formData.phone,
        website: formData.website,
        industry: formData.industry,
        details: {
          source: 'MANUAL',
          contactName: formData.contactName,
          address: formData.address,
          goals: formData.goals,
          budget: formData.budget,
          timeline: formData.timeline,
          targetAudience: formData.targetAudience,
          brandGuidelines: formData.brandGuidelines,
          competitors: formData.competitors,
          successMetrics: formData.successMetrics,
          notes: formData.notes,
        },
      });
      toast.success('Client created');
      setFormData(initialClientForm);
      setIsCreateOpen(false);
    } catch (error) {
      toast.error(error?.message || 'Failed to create client');
    }
  };

  const handleGenerateIntake = async () => {
    if (!currentWorkspace?.id) return;
    try {
      const result = await createIntake({
        workspaceId: currentWorkspace.id,
        clientId: null,
      });

      if (result?.link && navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(result.link);
        toast.success('Intake link copied');
      } else {
        toast.success('Intake link generated');
      }
    } catch (error) {
      toast.error(error?.message || 'Failed to generate intake link');
    }
  };

  const publicIntakeUrl = currentWorkspace?.id
    ? `${window.location.origin}/intake?workspaceId=${encodeURIComponent(
        currentWorkspace.id
      )}&source=public`
    : '';

  const handleCopyPublicIntake = async () => {
    if (!publicIntakeUrl) {
      toast.error('Workspace is required to generate a public link');
      return;
    }

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(publicIntakeUrl);
        toast.success('Public intake link copied');
      } else {
        toast.success('Public intake link ready');
      }
    } catch (error) {
      toast.error('Failed to copy public intake link');
    }
  };

  const openProjectFromIntake = async (intake) => {
    if (!intake) return;

    if (!intake.clientId && currentWorkspace?.id) {
      try {
        const payload = intake.payload || {};
        const created = await createClient({
          workspaceId: currentWorkspace.id,
          name:
            payload.contact_name ||
            payload.clientName ||
            payload.company_name ||
            payload.company ||
            'Client',
          company: payload.company_name || payload.company,
          email: payload.email,
          phone: payload.phone,
          website:
            payload.company_website ||
            payload.website ||
            payload.service_responses?.current_url,
          industry: payload.industry,
          details: {
            source: 'INTAKE',
            intakeId: intake.id,
            serviceType: payload.service_type || null,
            contactRole: payload.contact_role || null,
            businessDetails: payload.business_details || null,
            serviceResponses: payload.service_responses || null,
            uploadedFiles: payload.uploaded_files || null,
            calendlyEventId: payload.calendly_event_id || null,
            projectName: payload.projectName || null,
            goals: payload.goals || null,
            budget: payload.budget || null,
            timeline: payload.timeline || null,
            targetAudience: payload.targetAudience || null,
            brandGuidelines: payload.brandGuidelines || null,
            competitors: payload.competitors || null,
            successMetrics: payload.successMetrics || null,
            notes: payload.notes || null,
          },
        });

        setSelectedIntake({
          ...intake,
          clientId: created?.id || null,
          clientName:
            created?.name || payload.contact_name || payload.clientName,
        });
      } catch (error) {
        toast.error(error?.message || 'Failed to attach client');
        setSelectedIntake(intake);
      }
    } else {
      setSelectedIntake(intake);
    }

    setShowProjectDialog(true);
  };

  const openDetails = (intake) => {
    setSelectedDetails(intake);
  };

  const openClientDetails = (client) => {
    setSelectedClient(client);
  };

  const clearFilters = () => {
    setStatusFilter('ALL');
    setSortBy('name-asc');
  };

  const buildProjectDescription = (payload = {}) => {
    const business = payload.business_details || {};
    const serviceSummary = buildServiceSummary(payload);

    const sections = [
      payload.service_type &&
        `Service: ${getServiceLabel(payload.service_type)}`,
      payload.industry && `Industry: ${payload.industry}`,
      business.problem_solving && `Problem: ${business.problem_solving}`,
      business.success_90_days && `90-Day Success: ${business.success_90_days}`,
      business.launch_date && `Launch Date: ${business.launch_date}`,
      business.biggest_concern &&
        `Biggest Concern: ${business.biggest_concern}`,
      serviceSummary && `Service Details:\n${serviceSummary}`,
      payload.goals && `Goals: ${payload.goals}`,
      payload.targetAudience && `Audience: ${payload.targetAudience}`,
      payload.budget && `Budget: ${payload.budget}`,
      payload.timeline && `Timeline: ${payload.timeline}`,
      payload.successMetrics && `Success: ${payload.successMetrics}`,
      payload.brandGuidelines && `Brand: ${payload.brandGuidelines}`,
      payload.competitors && `Competitors: ${payload.competitors}`,
      payload.notes && `Notes: ${payload.notes}`,
    ].filter(Boolean);

    return sections.join('\n');
  };

  const intakePayload = selectedIntake?.payload || {};
  const DetailItem = ({ label, value, multiline = false }) => {
    const displayValue =
      value === null || value === undefined || value === '' ? 'N/A' : value;

    return (
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
          {label}
        </p>
        <p
          className={`text-sm text-zinc-900 dark:text-zinc-100 break-words ${
            multiline ? 'whitespace-pre-wrap' : ''
          }`}
        >
          {displayValue}
        </p>
      </div>
    );
  };

  if (!isAdmin) {
    return (
      <div className="p-6 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-200">
        <h2 className="text-xl font-semibold">Client Access</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">
          Only workspace admins can manage clients.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">
            Clients
          </h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400">
            Manage client profiles and intake requests from your team or direct
            client submissions.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <button
            onClick={handleGenerateIntake}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded border border-zinc-300 dark:border-zinc-700 text-sm text-zinc-700 dark:text-zinc-200 w-full sm:w-auto whitespace-nowrap"
            disabled={intakePending}
          >
            <LinkIcon className="size-4" />
            {intakePending ? 'Generating...' : 'Generate Intake Link'}
          </button>
          <button
            onClick={handleCopyPublicIntake}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded border border-zinc-300 dark:border-zinc-700 text-sm text-zinc-700 dark:text-zinc-200 w-full sm:w-auto whitespace-nowrap"
          >
            <LinkIcon className="size-4" />
            Copy Public Intake Link
          </button>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded bg-linear-to-br from-blue-500 to-blue-600 text-white text-sm w-full sm:w-auto whitespace-nowrap"
          >
            <Plus className="size-4" /> New Client
          </button>
        </div>
      </div>

      {isCreateOpen && (
        <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-6">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
            Create Client Profile
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
            Capture the client vision and requirements for future projects.
          </p>

          <form onSubmit={handleCreateClient} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm">Client Name</label>
                <input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="w-full mt-2 px-3 py-2 rounded border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 text-sm"
                  required
                />
              </div>
              <div>
                <label className="text-sm">Company</label>
                <input
                  value={formData.company}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      company: e.target.value,
                    }))
                  }
                  className="w-full mt-2 px-3 py-2 rounded border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 text-sm"
                />
              </div>
              <div>
                <label className="text-sm">Primary Contact</label>
                <input
                  value={formData.contactName}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      contactName: e.target.value,
                    }))
                  }
                  className="w-full mt-2 px-3 py-2 rounded border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 text-sm"
                />
              </div>
              <div>
                <label className="text-sm">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, email: e.target.value }))
                  }
                  className="w-full mt-2 px-3 py-2 rounded border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 text-sm"
                />
              </div>
              <div>
                <label className="text-sm">Phone</label>
                <input
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, phone: e.target.value }))
                  }
                  className="w-full mt-2 px-3 py-2 rounded border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 text-sm"
                />
              </div>
              <div>
                <label className="text-sm">Website</label>
                <input
                  value={formData.website}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      website: e.target.value,
                    }))
                  }
                  className="w-full mt-2 px-3 py-2 rounded border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 text-sm"
                />
              </div>
              <div>
                <label className="text-sm">Industry</label>
                <input
                  value={formData.industry}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      industry: e.target.value,
                    }))
                  }
                  className="w-full mt-2 px-3 py-2 rounded border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 text-sm"
                />
              </div>
              <div>
                <label className="text-sm">Address</label>
                <input
                  value={formData.address}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      address: e.target.value,
                    }))
                  }
                  className="w-full mt-2 px-3 py-2 rounded border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 text-sm"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm">Project Goals</label>
                <textarea
                  value={formData.goals}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, goals: e.target.value }))
                  }
                  className="w-full mt-2 px-3 py-2 rounded border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 text-sm h-24"
                />
              </div>
              <div>
                <label className="text-sm">Target Audience</label>
                <textarea
                  value={formData.targetAudience}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      targetAudience: e.target.value,
                    }))
                  }
                  className="w-full mt-2 px-3 py-2 rounded border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 text-sm h-24"
                />
              </div>
              <div>
                <label className="text-sm">Budget</label>
                <input
                  value={formData.budget}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, budget: e.target.value }))
                  }
                  className="w-full mt-2 px-3 py-2 rounded border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 text-sm"
                />
              </div>
              <div>
                <label className="text-sm">Timeline</label>
                <input
                  value={formData.timeline}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      timeline: e.target.value,
                    }))
                  }
                  className="w-full mt-2 px-3 py-2 rounded border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 text-sm"
                />
              </div>
              <div>
                <label className="text-sm">Brand Guidelines</label>
                <textarea
                  value={formData.brandGuidelines}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      brandGuidelines: e.target.value,
                    }))
                  }
                  className="w-full mt-2 px-3 py-2 rounded border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 text-sm h-24"
                />
              </div>
              <div>
                <label className="text-sm">Competitors</label>
                <textarea
                  value={formData.competitors}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      competitors: e.target.value,
                    }))
                  }
                  className="w-full mt-2 px-3 py-2 rounded border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 text-sm h-24"
                />
              </div>
              <div>
                <label className="text-sm">Success Metrics</label>
                <textarea
                  value={formData.successMetrics}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      successMetrics: e.target.value,
                    }))
                  }
                  className="w-full mt-2 px-3 py-2 rounded border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 text-sm h-24"
                />
              </div>
              <div>
                <label className="text-sm">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  className="w-full mt-2 px-3 py-2 rounded border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 text-sm h-24"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="px-4 py-2 text-sm border border-zinc-300 dark:border-zinc-700 rounded"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="px-4 py-2 text-sm bg-linear-to-br from-blue-500 to-blue-600 text-white rounded"
              >
                {isPending ? 'Saving...' : 'Save Client'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
        <div className="flex flex-col sm:flex-row flex-wrap gap-3 w-full">
          <div className="flex flex-col gap-1 w-full sm:w-auto">
            <span className="text-xs font-medium text-zinc-500">Status</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-48 px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-white shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
          <div className="flex flex-col gap-1 w-full sm:w-auto">
            <span className="text-xs font-medium text-zinc-500">Sort by</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full sm:w-56 px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-white shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="name-asc">Name (A-Z)</option>
              <option value="name-desc">Name (Z-A)</option>
              <option value="company-asc">Company (A-Z)</option>
              <option value="company-desc">Company (Z-A)</option>
            </select>
          </div>
          {(statusFilter !== 'ALL' || sortBy !== 'name-asc') && (
            <button
              type="button"
              onClick={clearFilters}
              className="flex items-center justify-center gap-1 px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm w-full sm:w-auto shadow-sm"
            >
              <X className="size-3" /> Clear
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredClients.map((client) => (
          <div
            key={client.id}
            className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-2 min-w-0"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
                  {client.name}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {client.company || client.industry || 'Client'}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {client.details?.source === 'PUBLIC' && (
                  <span className="text-[10px] px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200">
                    Client-submitted
                  </span>
                )}
                {client.details?.source === 'INTAKE' && (
                  <span className="text-[10px] px-2 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-200">
                    Intake link
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => openClientDetails(client)}
                  className="text-xs px-3 py-1 rounded border border-zinc-300 dark:border-zinc-700 w-full sm:w-auto"
                >
                  View Details
                </button>
              </div>
            </div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400 space-y-1 break-words">
              {client.email && (
                <div className="break-words">Email: {client.email}</div>
              )}
              {client.phone && (
                <div className="break-words">Phone: {client.phone}</div>
              )}
              {client.website && (
                <div className="break-words">Website: {client.website}</div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
          Client Intake Submissions
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
          Review client responses and create a project.
        </p>
        {intakeList.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No submissions yet.
          </p>
        ) : (
          <div className="space-y-3">
            {intakeList.map((intake) => (
              <div
                key={intake.id}
                className="border border-zinc-200 dark:border-zinc-800 rounded-md p-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                      {getIntakeDisplayName(intake.payload)}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Submitted on{' '}
                      {intake.submittedAt
                        ? new Date(intake.submittedAt).toLocaleDateString()
                        : 'N/A'}
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      type="button"
                      onClick={() => openDetails(intake)}
                      className="text-xs px-3 py-2 rounded border border-zinc-300 dark:border-zinc-700 w-full sm:w-auto"
                    >
                      View Details
                    </button>
                    <button
                      type="button"
                      onClick={() => openProjectFromIntake(intake)}
                      className="text-xs px-3 py-2 rounded bg-linear-to-br from-blue-500 to-blue-600 text-white w-full sm:w-auto"
                    >
                      Create Project
                    </button>
                  </div>
                </div>
                <div className="mt-3 text-xs text-zinc-600 dark:text-zinc-400 space-y-1">
                  {intake.payload?.service_type && (
                    <div>
                      Service: {getServiceLabel(intake.payload.service_type)}
                    </div>
                  )}
                  {intake.payload?.business_details?.launch_date && (
                    <div>
                      Launch Date: {intake.payload.business_details.launch_date}
                    </div>
                  )}
                  {intake.payload?.business_details?.problem_solving && (
                    <div>
                      Problem: {intake.payload.business_details.problem_solving}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showProjectDialog && (
        <CreateProjectDialog
          isDialogOpen={showProjectDialog}
          setIsDialogOpen={setShowProjectDialog}
          initialData={{
            name:
              intakePayload.projectName ||
              intakePayload.contact_name ||
              intakePayload.clientName ||
              '',
            description: buildProjectDescription(intakePayload),
            status: 'PLANNING',
            priority: 'MEDIUM',
            clientId: selectedIntake?.clientId || null,
            clientName:
              intakePayload.contact_name ||
              intakePayload.clientName ||
              selectedIntake?.clientName ||
              intakePayload.company_name ||
              intakePayload.company ||
              'Client',
          }}
        />
      )}

      {selectedDetails && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex justify-end">
          <div className="bg-white dark:bg-zinc-950 border-l border-zinc-200 dark:border-zinc-800 w-full max-w-lg h-full p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                  Intake Details
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {getIntakeDisplayName(selectedDetails.payload)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDetails(null)}
                className="text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-4 text-sm text-zinc-600 dark:text-zinc-300">
              <div>
                <p className="font-medium text-zinc-900 dark:text-zinc-100">
                  Contact
                </p>
                <p>
                  Name:{' '}
                  {selectedDetails.payload?.contact_name ||
                    selectedDetails.payload?.clientName ||
                    'N/A'}
                </p>
                <p>
                  Company:{' '}
                  {selectedDetails.payload?.company_name ||
                    selectedDetails.payload?.company ||
                    'N/A'}
                </p>
                <p>Role: {selectedDetails.payload?.contact_role || 'N/A'}</p>
                <p>Email: {selectedDetails.payload?.email || 'N/A'}</p>
                <p>Phone: {selectedDetails.payload?.phone || 'N/A'}</p>
                <p>
                  Website:{' '}
                  {selectedDetails.payload?.company_website ||
                    selectedDetails.payload?.website ||
                    selectedDetails.payload?.service_responses?.current_url ||
                    'N/A'}
                </p>
                <p>Industry: {selectedDetails.payload?.industry || 'N/A'}</p>
              </div>
              <div>
                <p className="font-medium text-zinc-900 dark:text-zinc-100">
                  Business Details
                </p>
                <p>
                  Problem:{' '}
                  {selectedDetails.payload?.business_details?.problem_solving ||
                    'N/A'}
                </p>
                <p>
                  90-Day Success:{' '}
                  {selectedDetails.payload?.business_details?.success_90_days ||
                    'N/A'}
                </p>
                <p>
                  Launch Date:{' '}
                  {selectedDetails.payload?.business_details?.launch_date ||
                    'N/A'}
                </p>
                <p>
                  Biggest Concern:{' '}
                  {selectedDetails.payload?.business_details?.biggest_concern ||
                    'N/A'}
                </p>
              </div>
              <div>
                <p className="font-medium text-zinc-900 dark:text-zinc-100">
                  Service Requirements
                </p>
                <p>
                  Service:{' '}
                  {selectedDetails.payload?.service_type
                    ? getServiceLabel(selectedDetails.payload.service_type)
                    : 'N/A'}
                </p>
                <p>
                  Details:{' '}
                  <span className="whitespace-pre-line">
                    {buildServiceSummary(selectedDetails.payload) || 'N/A'}
                  </span>
                </p>
              </div>
            </div>

            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedDetails(null);
                  openProjectFromIntake(selectedDetails);
                }}
                className="flex-1 px-4 py-2 rounded bg-linear-to-br from-blue-500 to-blue-600 text-white text-sm"
              >
                Create Project
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedClient && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex justify-end">
          <div className="bg-white dark:bg-zinc-950 border-l border-zinc-200 dark:border-zinc-800 w-full lg:w-1/2 xl:w-[50vw] h-full p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                  Client Details
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {selectedClient.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedClient(null)}
                className="text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="space-y-5">
              <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 p-4">
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
                  Contact
                </p>
                <div className="grid sm:grid-cols-2 gap-4">
                  <DetailItem label="Name" value={selectedClient.name} />
                  <DetailItem label="Company" value={selectedClient.company} />
                  <DetailItem label="Email" value={selectedClient.email} />
                  <DetailItem label="Phone" value={selectedClient.phone} />
                  <DetailItem label="Website" value={selectedClient.website} />
                  <DetailItem
                    label="Industry"
                    value={selectedClient.industry}
                  />
                </div>
              </div>

              <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 p-4">
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
                  Project Preferences
                </p>
                <div className="grid sm:grid-cols-2 gap-4">
                  <DetailItem
                    label="Primary Contact"
                    value={
                      selectedClient.contactName ||
                      selectedClient.details?.contactName
                    }
                  />
                  <DetailItem
                    label="Contact Role"
                    value={
                      selectedClient.contactRole ||
                      selectedClient.details?.contactRole
                    }
                  />
                  <DetailItem
                    label="Address"
                    value={selectedClient.details?.address}
                  />
                  <DetailItem
                    label="Goals"
                    value={selectedClient.details?.goals}
                    multiline
                  />
                  <DetailItem
                    label="Budget"
                    value={selectedClient.details?.budget}
                  />
                  <DetailItem
                    label="Timeline"
                    value={selectedClient.details?.timeline}
                  />
                  <DetailItem
                    label="Audience"
                    value={selectedClient.details?.targetAudience}
                    multiline
                  />
                </div>
              </div>

              <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 p-4">
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
                  Service Intake
                </p>
                <div className="grid sm:grid-cols-2 gap-4">
                  <DetailItem
                    label="Service"
                    value={
                      selectedClient.serviceType ||
                      selectedClient.details?.serviceType
                        ? getServiceLabel(
                            selectedClient.serviceType ||
                              selectedClient.details?.serviceType
                          )
                        : null
                    }
                  />
                  <DetailItem
                    label="Contact Role"
                    value={
                      selectedClient.contactRole ||
                      selectedClient.details?.contactRole
                    }
                  />
                  <DetailItem
                    label="Problem"
                    value={
                      selectedClient.businessDetails?.problem_solving ||
                      selectedClient.details?.businessDetails?.problem_solving
                    }
                    multiline
                  />
                  <DetailItem
                    label="90-Day Success"
                    value={
                      selectedClient.businessDetails?.success_90_days ||
                      selectedClient.details?.businessDetails?.success_90_days
                    }
                    multiline
                  />
                  <DetailItem
                    label="Launch Date"
                    value={
                      selectedClient.businessDetails?.launch_date ||
                      selectedClient.details?.businessDetails?.launch_date
                    }
                  />
                  <DetailItem
                    label="Biggest Concern"
                    value={
                      selectedClient.businessDetails?.biggest_concern ||
                      selectedClient.details?.businessDetails?.biggest_concern
                    }
                    multiline
                  />
                  <DetailItem
                    label="Service Details"
                    multiline
                    value={buildServiceSummary({
                      service_type:
                        selectedClient.serviceType ||
                        selectedClient.details?.serviceType,
                      service_responses:
                        selectedClient.serviceResponses ||
                        selectedClient.details?.serviceResponses,
                    })}
                  />
                  <DetailItem
                    label="Brand Guidelines"
                    value={selectedClient.details?.brandGuidelines}
                    multiline
                  />
                  <DetailItem
                    label="Competitors"
                    value={selectedClient.details?.competitors}
                    multiline
                  />
                  <DetailItem
                    label="Success Metrics"
                    value={selectedClient.details?.successMetrics}
                    multiline
                  />
                </div>
              </div>

              <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 p-4">
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
                  Notes
                </p>
                <div className="grid sm:grid-cols-2 gap-4">
                  <DetailItem
                    label="Notes"
                    value={selectedClient.details?.notes}
                    multiline
                  />
                  <DetailItem
                    label="Uploaded Files"
                    value={
                      selectedClient.uploadedFiles?.length ||
                      selectedClient.details?.uploadedFiles?.length ||
                      0
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Clients;
