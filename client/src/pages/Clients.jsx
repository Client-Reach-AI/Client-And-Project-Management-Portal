import { useMemo, useState } from 'react';
import { Filter, Link as LinkIcon, Plus, Search, X } from 'lucide-react';
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

const Clients = () => {
  const { currentWorkspace } = useWorkspaceContext();
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
  const [searchTerm, setSearchTerm] = useState('');
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
    const normalized = searchTerm.trim().toLowerCase();
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
  }, [clients, searchTerm, statusFilter, sortBy]);

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

  const openProjectFromIntake = async (intake) => {
    if (!intake) return;

    if (!intake.clientId && currentWorkspace?.id) {
      try {
        const payload = intake.payload || {};
        const created = await createClient({
          workspaceId: currentWorkspace.id,
          name: payload.clientName || payload.company || 'Client',
          company: payload.company,
          email: payload.email,
          phone: payload.phone,
          website: payload.website,
          industry: payload.industry,
          details: {
            source: 'INTAKE',
            intakeId: intake.id,
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
          clientName: created?.name || payload.clientName,
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
    setSearchTerm('');
    setStatusFilter('ALL');
    setSortBy('name-asc');
  };

  const buildProjectDescription = (payload) => {
    const sections = [
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
        <div className="flex gap-3">
          <button
            onClick={handleGenerateIntake}
            className="flex items-center gap-2 px-4 py-2 rounded border border-zinc-300 dark:border-zinc-700 text-sm text-zinc-700 dark:text-zinc-200"
            disabled={intakePending}
          >
            <LinkIcon className="size-4" />
            {intakePending ? 'Generating...' : 'Generate Intake Link'}
          </button>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded bg-linear-to-br from-blue-500 to-blue-600 text-white text-sm"
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
        <div className="relative w-full lg:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search clients"
            className="w-full pl-9 pr-3 py-2 rounded border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 text-sm"
          />
        </div>
        <div className="flex flex-col sm:flex-row flex-wrap gap-2 w-full">
          <div className="flex items-center gap-2 px-3 py-2 rounded border border-zinc-300 dark:border-zinc-700 text-sm w-full sm:w-auto">
            <Filter className="size-4 text-zinc-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent outline-none w-full sm:w-auto"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded border border-zinc-300 dark:border-zinc-700 text-sm w-full sm:w-auto">
            <span className="text-zinc-500">Sort</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-transparent outline-none w-full sm:w-auto"
            >
              <option value="name-asc">Name (A-Z)</option>
              <option value="name-desc">Name (Z-A)</option>
              <option value="company-asc">Company (A-Z)</option>
              <option value="company-desc">Company (Z-A)</option>
            </select>
          </div>
          {(searchTerm || statusFilter !== 'ALL' || sortBy !== 'name-asc') && (
            <button
              type="button"
              onClick={clearFilters}
              className="flex items-center justify-center gap-1 px-3 py-2 rounded border border-zinc-300 dark:border-zinc-700 text-sm w-full sm:w-auto"
            >
              <X className="size-3" /> Clear
            </button>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {filteredClients.map((client) => (
          <div
            key={client.id}
            className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-2"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
                  {client.name}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {client.company || client.industry || 'Client'}
                </p>
              </div>
              <div className="flex gap-2">
                {client.details?.source === 'INTAKE' && (
                  <span className="text-[10px] px-2 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-200">
                    Client-submitted
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => openClientDetails(client)}
                  className="text-xs px-3 py-1 rounded border border-zinc-300 dark:border-zinc-700"
                >
                  View Details
                </button>
              </div>
            </div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400 space-y-1">
              {client.email && <div>Email: {client.email}</div>}
              {client.phone && <div>Phone: {client.phone}</div>}
              {client.website && <div>Website: {client.website}</div>}
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
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                      {intake.payload?.clientName || 'Client Submission'}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Submitted on{' '}
                      {intake.submittedAt
                        ? new Date(intake.submittedAt).toLocaleDateString()
                        : 'N/A'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => openDetails(intake)}
                      className="text-xs px-3 py-1 rounded border border-zinc-300 dark:border-zinc-700"
                    >
                      View Details
                    </button>
                    <button
                      type="button"
                      onClick={() => openProjectFromIntake(intake)}
                      className="text-xs px-3 py-1 rounded bg-linear-to-br from-blue-500 to-blue-600 text-white"
                    >
                      Create Project
                    </button>
                  </div>
                </div>
                <div className="mt-3 text-xs text-zinc-600 dark:text-zinc-400 space-y-1">
                  {intake.payload?.goals && (
                    <div>Goals: {intake.payload.goals}</div>
                  )}
                  {intake.payload?.timeline && (
                    <div>Timeline: {intake.payload.timeline}</div>
                  )}
                  {intake.payload?.budget && (
                    <div>Budget: {intake.payload.budget}</div>
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
            name: intakePayload.projectName || intakePayload.clientName || '',
            description: buildProjectDescription(intakePayload),
            status: 'PLANNING',
            priority: 'MEDIUM',
            clientId: selectedIntake?.clientId || null,
            clientName:
              intakePayload.clientName ||
              selectedIntake?.clientName ||
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
                  {selectedDetails.payload?.clientName || 'Client Submission'}
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
                <p>Name: {selectedDetails.payload?.clientName || 'N/A'}</p>
                <p>Company: {selectedDetails.payload?.company || 'N/A'}</p>
                <p>Email: {selectedDetails.payload?.email || 'N/A'}</p>
                <p>Phone: {selectedDetails.payload?.phone || 'N/A'}</p>
                <p>Website: {selectedDetails.payload?.website || 'N/A'}</p>
              </div>
              <div>
                <p className="font-medium text-zinc-900 dark:text-zinc-100">
                  Project Vision
                </p>
                <p>Goals: {selectedDetails.payload?.goals || 'N/A'}</p>
                <p>
                  Audience: {selectedDetails.payload?.targetAudience || 'N/A'}
                </p>
                <p>Budget: {selectedDetails.payload?.budget || 'N/A'}</p>
                <p>Timeline: {selectedDetails.payload?.timeline || 'N/A'}</p>
              </div>
              <div>
                <p className="font-medium text-zinc-900 dark:text-zinc-100">
                  Brand & Competition
                </p>
                <p>
                  Brand Guidelines:{' '}
                  {selectedDetails.payload?.brandGuidelines || 'N/A'}
                </p>
                <p>
                  Competitors: {selectedDetails.payload?.competitors || 'N/A'}
                </p>
                <p>
                  Success Metrics:{' '}
                  {selectedDetails.payload?.successMetrics || 'N/A'}
                </p>
              </div>
              <div>
                <p className="font-medium text-zinc-900 dark:text-zinc-100">
                  Notes
                </p>
                <p>{selectedDetails.payload?.notes || 'N/A'}</p>
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
          <div className="bg-white dark:bg-zinc-950 border-l border-zinc-200 dark:border-zinc-800 w-full max-w-lg h-full p-6 overflow-y-auto">
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

            <div className="space-y-4 text-sm text-zinc-600 dark:text-zinc-300">
              <div>
                <p className="font-medium text-zinc-900 dark:text-zinc-100">
                  Contact
                </p>
                <p>Name: {selectedClient.name || 'N/A'}</p>
                <p>Company: {selectedClient.company || 'N/A'}</p>
                <p>Email: {selectedClient.email || 'N/A'}</p>
                <p>Phone: {selectedClient.phone || 'N/A'}</p>
                <p>Website: {selectedClient.website || 'N/A'}</p>
                <p>Industry: {selectedClient.industry || 'N/A'}</p>
              </div>
              <div>
                <p className="font-medium text-zinc-900 dark:text-zinc-100">
                  Project Preferences
                </p>
                <p>
                  Primary Contact:{' '}
                  {selectedClient.details?.contactName || 'N/A'}
                </p>
                <p>Address: {selectedClient.details?.address || 'N/A'}</p>
                <p>Goals: {selectedClient.details?.goals || 'N/A'}</p>
                <p>Budget: {selectedClient.details?.budget || 'N/A'}</p>
                <p>Timeline: {selectedClient.details?.timeline || 'N/A'}</p>
                <p>
                  Audience: {selectedClient.details?.targetAudience || 'N/A'}
                </p>
              </div>
              <div>
                <p className="font-medium text-zinc-900 dark:text-zinc-100">
                  Brand & Competition
                </p>
                <p>
                  Brand Guidelines:{' '}
                  {selectedClient.details?.brandGuidelines || 'N/A'}
                </p>
                <p>
                  Competitors: {selectedClient.details?.competitors || 'N/A'}
                </p>
                <p>
                  Success Metrics:{' '}
                  {selectedClient.details?.successMetrics || 'N/A'}
                </p>
              </div>
              <div>
                <p className="font-medium text-zinc-900 dark:text-zinc-100">
                  Notes
                </p>
                <p>{selectedClient.details?.notes || 'N/A'}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Clients;
