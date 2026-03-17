import { useEffect, useMemo, useState } from 'react';
import { Copy, LinkIcon, Plus, Trash2, UploadCloudIcon, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import CreateProjectDialog from '../components/CreateProjectDialog';
import { useWorkspaceContext } from '../context/workspaceContext';
import { useClients, useLeadIntakes, useLeadResources } from '../hooks/useQueries';
import {
  useCreateClient,
  useCreateFileSignature,
  useCreateLeadIntake,
  useDeleteLeadIntake,
  useCreateLeadResource,
  useDeleteLeadResource,
  useUpdateLeadStatus,
} from '../hooks/useMutations';

const initialLeadForm = {
  name: '',
  email: '',
  phone: '',
  businessModel: '',
  sourceKey: '',
  biggestBottleneck: '',
};

const leadStatusStyles = {
  NEW: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200',
  CONTACTED:
    'bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-200',
  QUALIFIED:
    'bg-indigo-100 text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-200',
  PROPOSAL_SENT:
    'bg-violet-100 text-violet-800 dark:bg-violet-500/20 dark:text-violet-200',
  WON: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200',
  LOST: 'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-200',
};

const leadStatusOptions = [
  'NEW',
  'CONTACTED',
  'QUALIFIED',
  'PROPOSAL_SENT',
  'WON',
  'LOST',
];

const formatLeadStatus = (value) =>
  String(value || 'NEW')
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const getLeadName = (payload = {}) =>
  payload.name ||
  payload.contact_name ||
  payload.clientName ||
  payload.company_name ||
  payload.company ||
  'Unknown';

const getLeadPhone = (payload = {}) =>
  payload.phone || payload.contact_phone || 'N/A';

const normalizeSourceKey = (value = '') =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const getBusinessModel = (payload = {}) => {
  const value = payload.business_model || payload.service_type || '';
  if (!value) return 'N/A';
  return value
    .replace(/[-_]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

const formatDateTime = (value) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleString();
};

const buildOpenUrl = (item) => {
  const url = item?.url || '';
  if (!url) return '';
  if (item?.mimeType?.includes('pdf') && url.includes('/image/upload/')) {
    return url.replace('/image/upload/', '/raw/upload/');
  }
  return url;
};

const buildSimpleLeadLinkWithSource = (baseUrl, sourceKey) => {
  if (!baseUrl || !sourceKey) return '';
  return `${baseUrl}${encodeURIComponent(sourceKey)}`;
};

const uploadToCloudinaryWithProgress = ({
  cloudName,
  resourceType,
  formData,
  onProgress,
}) =>
  new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(
      'POST',
      `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`
    );
    xhr.responseType = 'json';

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || typeof onProgress !== 'function') return;
      const percent = Math.round((event.loaded / event.total) * 100);
      onProgress(Math.min(Math.max(percent, 0), 100));
    };

    xhr.onload = () => {
      const response =
        xhr.response && typeof xhr.response === 'object'
          ? xhr.response
          : (() => {
              try {
                return JSON.parse(xhr.responseText || '{}');
              } catch {
                return {};
              }
            })();

      if (xhr.status >= 200 && xhr.status < 300 && !response?.error) {
        resolve(response);
        return;
      }

      reject(new Error(response?.error?.message || 'Upload failed'));
    };

    xhr.onerror = () => {
      reject(new Error('Upload failed'));
    };

    xhr.send(formData);
  });

const Leads = () => {
  const user = useSelector((state) => state.auth.user);
  const { currentWorkspace } = useWorkspaceContext();
  const navigate = useNavigate();
  const memberRole = currentWorkspace?.members?.find(
    (member) => member.user.id === user?.id
  )?.role;
  const isAdmin = user?.role === 'ADMIN' || memberRole === 'ADMIN';

  const workspaceId = currentWorkspace?.id || null;

  const { data: intakes = [] } = useLeadIntakes(workspaceId, {
    enabled: Boolean(workspaceId && isAdmin),
  });
  const { data: clients = [] } = useClients(workspaceId, {
    enabled: Boolean(workspaceId && isAdmin),
  });
  const { data: leadResources = [], isLoading: resourcesLoading } =
    useLeadResources(workspaceId, {
      enabled: Boolean(workspaceId && isAdmin),
    });
  const { mutateAsync: createClient } = useCreateClient();
  const { mutateAsync: createSignature } = useCreateFileSignature();
  const { mutateAsync: createLeadIntake, isPending: creatingLead } =
    useCreateLeadIntake();
  const { mutateAsync: deleteLeadIntake } = useDeleteLeadIntake();
  const { mutateAsync: updateLeadStatus } = useUpdateLeadStatus();
  const { mutateAsync: createLeadResource } = useCreateLeadResource();
  const { mutateAsync: deleteLeadResource } = useDeleteLeadResource();

  const [activeTab, setActiveTab] = useState('leads');
  const [isCreateLeadOpen, setIsCreateLeadOpen] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [leadForm, setLeadForm] = useState(initialLeadForm);
  const [showProjectDialog, setShowProjectDialog] = useState(false);
  const [projectInitialData, setProjectInitialData] = useState(null);

  const [resourceName, setResourceName] = useState('');
  const [uploadingResource, setUploadingResource] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [deletingLeadId, setDeletingLeadId] = useState(null);
  const [updatingLeadId, setUpdatingLeadId] = useState(null);
  const [convertingLeadId, setConvertingLeadId] = useState(null);

  const workspaceProjects = currentWorkspace?.projects || [];

  const leads = useMemo(() => {
    return intakes
      .filter((intake) => intake.status === 'SUBMITTED')
      .map((intake) => {
        const payload = intake.payload || {};
        const sourceKey =
          payload.src || normalizeSourceKey(payload.business_model || '');
        return {
          id: intake.id,
          payload,
          name: getLeadName(payload),
          leadStatus: intake.leadStatus || 'NEW',
          email: payload.email || 'N/A',
          phone: getLeadPhone(payload),
          businessModel: getBusinessModel(payload),
          sourceKey: sourceKey || 'N/A',
          biggestBottleneck:
            payload.biggest_bottleneck ||
            payload.business_details?.problem_solving ||
            'N/A',
          submittedAt: intake.submittedAt,
        };
      })
      .sort((a, b) => {
        const aTime = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
        const bTime = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
        return bTime - aTime;
      });
  }, [intakes]);

  const selectedLead = leads.find((lead) => lead.id === selectedLeadId) || null;

  const filteredLeads = useMemo(() => {
    if (statusFilter === 'ALL') return leads;
    return leads.filter((lead) => lead.leadStatus === statusFilter);
  }, [leads, statusFilter]);

  const leadStatusCounts = useMemo(() => {
    return leadStatusOptions.reduce(
      (acc, status) => {
        acc[status] = leads.filter((lead) => lead.leadStatus === status).length;
        return acc;
      },
      { ALL: leads.length }
    );
  }, [leads]);

  const findClientForLead = (lead) => {
    if (!lead) return null;

    if (lead.clientId) {
      return clients.find((client) => client.id === lead.clientId) || null;
    }

    return clients.find((client) => client.details?.leadId === lead.id) || null;
  };

  const findProjectsForLead = (lead) => {
    if (!lead) return [];

    if (lead.projectId) {
      const project = workspaceProjects.find((item) => item.id === lead.projectId);
      return project ? [project] : [];
    }

    return [];
  };

  const getLatestProjectForLead = (lead) => {
    const projects = findProjectsForLead(lead);
    if (!projects.length) return null;

    return [...projects].sort((a, b) => {
      const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return bTime - aTime;
    })[0];
  };

  const selectedLeadClient = selectedLead ? findClientForLead(selectedLead) : null;
  const selectedLeadProjects = selectedLead ? findProjectsForLead(selectedLead) : [];
  const selectedLeadLatestProject = selectedLead
    ? getLatestProjectForLead(selectedLead)
    : null;

  useEffect(() => {
    if (!selectedLeadId) return;
    const leadStillExists = leads.some((lead) => lead.id === selectedLeadId);
    if (!leadStillExists) {
      setSelectedLeadId(null);
      setIsDetailsOpen(false);
    }
  }, [leads, selectedLeadId]);

  const fullLeadFormUrl = workspaceId
    ? `${window.location.origin}/intake?workspaceId=${encodeURIComponent(
        workspaceId
      )}&source=public`
    : '';

  const simpleLeadFormUrl = workspaceId
    ? `${window.location.origin}/intake-simple?workspaceId=${encodeURIComponent(
        workspaceId
      )}&source=public&src=`
    : '';

  const copyText = async (value, successMessage) => {
    if (!value) {
      toast.error('Workspace is required');
      return;
    }
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      }
      toast.success(successMessage);
    } catch (error) {
      console.error(error);
      toast.error('Failed to copy');
    }
  };

  const handleUploadResource = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !workspaceId) return;

    const trimmedName = resourceName.trim();
    if (!trimmedName) {
      toast.error('Resource name is required');
      event.target.value = '';
      return;
    }

    const sourceKey = normalizeSourceKey(trimmedName);
    if (!sourceKey) {
      toast.error('Resource name must include letters or numbers');
      event.target.value = '';
      return;
    }

    setUploadingResource(true);
    setUploadProgress(0);
    try {
      const signature = await createSignature({
        workspaceId,
        folder: `lead-resources/${workspaceId}`,
      });

      const formData = new FormData();
      formData.append('file', file);
      formData.append('api_key', signature.apiKey);
      formData.append('timestamp', signature.timestamp);
      formData.append('signature', signature.signature);
      formData.append('folder', signature.folder);
      formData.append('public_id', signature.publicId);
      formData.append('access_mode', signature.accessMode || 'public');

      const isImage = file.type?.startsWith('image/');
      const resourceType = isImage ? 'image' : 'raw';
      const uploaded = await uploadToCloudinaryWithProgress({
        cloudName: signature.cloudName,
        resourceType,
        formData,
        onProgress: setUploadProgress,
      });
      setUploadProgress(100);

      await createLeadResource({
        workspaceId,
        name: trimmedName,
        url: uploaded.secure_url,
        size: uploaded.bytes,
        mimeType: file.type,
        cloudinaryPublicId: uploaded.public_id,
      });

      setResourceName('');
      toast.success(`Resource "${sourceKey}" saved`);
    } catch (error) {
      toast.error(error?.message || 'Failed to upload resource');
    } finally {
      setUploadingResource(false);
      setUploadProgress(0);
      event.target.value = '';
    }
  };

  const handleDeleteResource = async (resource) => {
    if (!resource?.id || !workspaceId) return;

    const confirmed = window.confirm(
      `Delete resource "${resource.label || resource.sourceKey}"?`
    );
    if (!confirmed) return;

    try {
      await deleteLeadResource({
        resourceId: resource.id,
        workspaceId,
      });
      toast.success('Resource deleted');
    } catch (error) {
      toast.error(error?.message || 'Failed to delete resource');
    }
  };

  const handleDeleteLead = async (event, lead) => {
    event.stopPropagation();
    if (!lead?.id || !workspaceId) return;

    const confirmed = window.confirm(`Delete lead "${lead.name}"?`);
    if (!confirmed) return;

    setDeletingLeadId(lead.id);
    try {
      await deleteLeadIntake({
        leadId: lead.id,
        workspaceId,
      });
      if (selectedLeadId === lead.id) {
        setSelectedLeadId(null);
        setIsDetailsOpen(false);
      }
      toast.success('Lead deleted');
    } catch (error) {
      toast.error(error?.message || 'Failed to delete lead');
    } finally {
      setDeletingLeadId(null);
    }
  };

  const handleLeadFormChange = (field, value) => {
    setLeadForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreateLead = async (event) => {
    event.preventDefault();
    if (!workspaceId) return;

    try {
      await createLeadIntake({
        workspaceId,
        name: leadForm.name,
        email: leadForm.email,
        phone: leadForm.phone,
        businessModel: leadForm.businessModel,
        sourceKey: leadForm.sourceKey,
        biggestBottleneck: leadForm.biggestBottleneck,
      });
      toast.success('Lead created');
      setLeadForm(initialLeadForm);
      setIsCreateLeadOpen(false);
    } catch (error) {
      toast.error(error?.message || 'Failed to create lead');
    }
  };

  const handleLeadStatusChange = async (leadId, leadStatus) => {
    if (!workspaceId || !leadId) return;

    setUpdatingLeadId(leadId);
    try {
      await updateLeadStatus({
        leadId,
        workspaceId,
        payload: { leadStatus },
      });
      toast.success(`Lead moved to ${formatLeadStatus(leadStatus)}`);
    } catch (error) {
      toast.error(error?.message || 'Failed to update lead status');
    } finally {
      setUpdatingLeadId(null);
    }
  };

  const createClientFromLead = async (lead) => {
    if (!workspaceId || !lead) return null;

    const existingClient = findClientForLead(lead);
    if (existingClient) return existingClient;

    const payload = lead.payload || {};
    const contactName = payload.contact_name || payload.contactName || lead.name;
    const contactRole = payload.contact_role || payload.contactRole || null;

    setConvertingLeadId(lead.id);
    try {
      const created = await createClient({
        workspaceId,
        leadId: lead.id,
        name: lead.name,
        company: payload.company_name || payload.company || null,
        contactName,
        contactRole,
        email: payload.email || null,
        phone: payload.phone || payload.contact_phone || null,
        website:
          payload.company_website ||
          payload.website ||
          payload.service_responses?.current_url ||
          null,
        industry: payload.industry || null,
        serviceType: payload.service_type || payload.business_model || null,
        businessDetails: payload.business_details || {},
        serviceResponses: payload.service_responses || {},
        uploadedFiles: payload.uploaded_files || [],
        details: {
          source: 'LEAD_CONVERSION',
          leadId: lead.id,
          sourceKey: lead.sourceKey !== 'N/A' ? lead.sourceKey : null,
          businessModel: payload.business_model || null,
          biggestBottleneck:
            lead.biggestBottleneck !== 'N/A' ? lead.biggestBottleneck : null,
          contactName,
          contactRole,
          originalLeadSubmittedAt: lead.submittedAt || null,
        },
      });

      toast.success('Client created from lead');
      return created;
    } catch (error) {
      toast.error(error?.message || 'Failed to create client from lead');
      return null;
    } finally {
      setConvertingLeadId(null);
    }
  };

  const handleCreateClientFromLead = async (lead) => {
    await createClientFromLead(lead);
  };

  const buildProjectInitialData = (lead, client) => {
    const businessModel =
      lead?.payload?.business_model || lead?.payload?.service_type || '';
    const projectName = businessModel
      ? `${client.name} - ${getBusinessModel({ business_model: businessModel })}`
      : `${client.name} Project`;

    return {
      clientId: client.id,
      clientName: client.name,
      name: projectName,
      description:
        lead?.biggestBottleneck && lead.biggestBottleneck !== 'N/A'
          ? `Primary bottleneck: ${lead.biggestBottleneck}`
          : '',
    };
  };

  const handleCreateProjectFromLead = async (lead) => {
    if (!lead) return;

    const client = await createClientFromLead(lead);
    if (!client?.id) return;

    setProjectInitialData({
      ...buildProjectInitialData(lead, client),
      leadId: lead.id,
    });
    setShowProjectDialog(true);
  };

  if (!isAdmin) {
    return (
      <div className="p-6 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <h2 className="text-xl font-semibold">Leads Access</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">
          Only workspace admins can manage leads.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-zinc-900 dark:text-white">
            Leads
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Manage lead links, submissions, and downloadable resources.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setIsCreateLeadOpen((prev) => !prev)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded bg-linear-to-br from-blue-500 to-blue-600 text-white text-sm"
          >
            <Plus className="size-4" />
            {isCreateLeadOpen ? 'Close Manual Lead' : 'Manual Lead'}
          </button>
          <div className="inline-flex rounded-lg border border-zinc-300 dark:border-zinc-700 overflow-hidden">
            <button
              type="button"
              onClick={() => setActiveTab('leads')}
              className={`px-4 py-2 text-sm ${
                activeTab === 'leads'
                  ? 'bg-zinc-900 text-white dark:bg-zinc-200 dark:text-zinc-900'
                  : 'bg-white text-zinc-700 dark:bg-zinc-900 dark:text-zinc-200'
              }`}
            >
              Leads
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('resources')}
              className={`px-4 py-2 text-sm border-l border-zinc-300 dark:border-zinc-700 ${
                activeTab === 'resources'
                  ? 'bg-zinc-900 text-white dark:bg-zinc-200 dark:text-zinc-900'
                  : 'bg-white text-zinc-700 dark:bg-zinc-900 dark:text-zinc-200'
              }`}
            >
              Lead Files
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'leads' && (
        <>
          {isCreateLeadOpen && (
            <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  Create Lead Manually
                </h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Add an offline or referral lead without changing the current lead flow.
                </p>
              </div>

              <form onSubmit={handleCreateLead} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-zinc-700 dark:text-zinc-200">
                      Name *
                    </label>
                    <input
                      type="text"
                      value={leadForm.name}
                      onChange={(event) =>
                        handleLeadFormChange('name', event.target.value)
                      }
                      required
                      className="w-full mt-2 px-3 py-2 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-zinc-700 dark:text-zinc-200">
                      Email *
                    </label>
                    <input
                      type="email"
                      value={leadForm.email}
                      onChange={(event) =>
                        handleLeadFormChange('email', event.target.value)
                      }
                      required
                      className="w-full mt-2 px-3 py-2 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-zinc-700 dark:text-zinc-200">
                      Phone
                    </label>
                    <input
                      type="text"
                      value={leadForm.phone}
                      onChange={(event) =>
                        handleLeadFormChange('phone', event.target.value)
                      }
                      className="w-full mt-2 px-3 py-2 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-zinc-700 dark:text-zinc-200">
                      Business Model
                    </label>
                    <input
                      type="text"
                      value={leadForm.businessModel}
                      onChange={(event) =>
                        handleLeadFormChange('businessModel', event.target.value)
                      }
                      placeholder="AI automation, website build..."
                      className="w-full mt-2 px-3 py-2 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm text-zinc-700 dark:text-zinc-200">
                      Source Key
                    </label>
                    <input
                      type="text"
                      value={leadForm.sourceKey}
                      onChange={(event) =>
                        handleLeadFormChange('sourceKey', event.target.value)
                      }
                      placeholder="referral, outbound, event-booth"
                      className="w-full mt-2 px-3 py-2 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm text-zinc-700 dark:text-zinc-200">
                      Biggest Bottleneck
                    </label>
                    <textarea
                      value={leadForm.biggestBottleneck}
                      onChange={(event) =>
                        handleLeadFormChange(
                          'biggestBottleneck',
                          event.target.value
                        )
                      }
                      className="w-full mt-2 px-3 py-2 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm h-24"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setLeadForm(initialLeadForm);
                      setIsCreateLeadOpen(false);
                    }}
                    className="px-4 py-2 text-sm border border-zinc-300 dark:border-zinc-700 rounded"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creatingLead}
                    className="px-4 py-2 text-sm bg-linear-to-br from-blue-500 to-blue-600 text-white rounded disabled:opacity-60"
                  >
                    {creatingLead ? 'Creating...' : 'Create Lead'}
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Lead Status Filter
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Showing {filteredLeads.length} of {leads.length} leads.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm"
                >
                  <option value="ALL">All Statuses</option>
                  {leadStatusOptions.map((status) => (
                    <option key={status} value={status}>
                      {formatLeadStatus(status)}
                    </option>
                  ))}
                </select>

                {statusFilter !== 'ALL' && (
                  <button
                    type="button"
                    onClick={() => setStatusFilter('ALL')}
                    className="px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 text-sm"
                  >
                    Clear Filter
                  </button>
                )}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 text-[11px] text-zinc-700 dark:text-zinc-200">
                All: {leadStatusCounts.ALL}
              </span>
              {leadStatusOptions.map((status) => (
                <span
                  key={status}
                  className={`rounded-full px-2.5 py-1 text-[11px] ${
                    leadStatusStyles[status] || leadStatusStyles.NEW
                  }`}
                >
                  {formatLeadStatus(status)}: {leadStatusCounts[status] || 0}
                </span>
              ))}
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Full Funnel Link
                </p>
                <button
                  type="button"
                  onClick={() =>
                    copyText(fullLeadFormUrl, 'Full funnel link copied')
                  }
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-xs rounded border border-zinc-300 dark:border-zinc-700"
                >
                  <LinkIcon className="size-3.5" />
                  Copy
                </button>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 break-all">
                {fullLeadFormUrl || 'No workspace selected'}
              </p>
            </div>

            <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Simple Link (Name + Email + src)
                </p>
                <button
                  type="button"
                  onClick={() =>
                    copyText(simpleLeadFormUrl, 'Simple link copied')
                  }
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-xs rounded border border-zinc-300 dark:border-zinc-700"
                >
                  <LinkIcon className="size-3.5" />
                  Copy
                </button>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 break-all">
                {simpleLeadFormUrl || 'No workspace selected'}
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-zinc-50 dark:bg-zinc-900/70">
                  <tr className="text-left text-zinc-500 dark:text-zinc-400">
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">Phone</th>
                    <th className="px-4 py-3 font-medium">Lead Status</th>
                    <th className="px-4 py-3 font-medium">Business Model</th>
                    <th className="px-4 py-3 font-medium">Source (src)</th>
                    <th className="px-4 py-3 font-medium">Submitted</th>
                    <th className="px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeads.length === 0 && (
                    <tr>
                      <td
                        className="px-4 py-6 text-zinc-500 dark:text-zinc-400"
                        colSpan={8}
                      >
                        No leads match the current filter.
                      </td>
                    </tr>
                  )}
                  {filteredLeads.map((lead) => {
                    const linkedClient = findClientForLead(lead);
                    const linkedProjects = findProjectsForLead(lead);

                    return (
                      <tr
                        key={lead.id}
                        onClick={() => {
                          setSelectedLeadId(lead.id);
                          setIsDetailsOpen(true);
                        }}
                        className={`border-t border-zinc-100 dark:border-zinc-800 cursor-pointer ${
                          selectedLead?.id === lead.id
                            ? 'bg-blue-50/70 dark:bg-blue-500/10'
                            : 'hover:bg-zinc-50 dark:hover:bg-zinc-900/60'
                        }`}
                      >
                        <td className="px-4 py-3 text-zinc-900 dark:text-zinc-100">
                          <div className="space-y-1">
                            <div>{lead.name}</div>
                            {(linkedClient || linkedProjects.length > 0) && (
                              <div className="flex flex-wrap gap-1.5">
                                {linkedClient && (
                                  <span className="rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200 px-2 py-0.5 text-[10px]">
                                    Client Created
                                  </span>
                                )}
                                {linkedProjects.length > 0 && (
                                  <span className="rounded-full bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-200 px-2 py-0.5 text-[10px]">
                                    {linkedProjects.length} Project{linkedProjects.length > 1 ? 's' : ''}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">
                          {lead.email}
                        </td>
                        <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">
                          {lead.phone}
                        </td>
                        <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">
                          <select
                            value={lead.leadStatus}
                            disabled={updatingLeadId === lead.id}
                            onClick={(event) => event.stopPropagation()}
                            onChange={(event) => {
                              event.stopPropagation();
                              handleLeadStatusChange(lead.id, event.target.value);
                            }}
                            className={`rounded-full border px-2.5 py-1 text-[10px] font-medium bg-transparent ${
                              leadStatusStyles[lead.leadStatus] || leadStatusStyles.NEW
                            } ${
                              updatingLeadId === lead.id
                                ? 'opacity-60 cursor-not-allowed'
                                : ''
                            }`}
                          >
                            {leadStatusOptions.map((status) => (
                              <option key={status} value={status}>
                                {formatLeadStatus(status)}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">
                          {lead.businessModel}
                        </td>
                        <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">
                          {lead.sourceKey}
                        </td>
                        <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">
                          {formatDateTime(lead.submittedAt)}
                        </td>
                        <td
                          className="px-4 py-3"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <button
                            type="button"
                            disabled={deletingLeadId === lead.id}
                            onClick={(event) => handleDeleteLead(event, lead)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs rounded border border-red-300 text-red-700 dark:border-red-800 dark:text-red-300 disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            <Trash2 className="size-3.5" />
                            {deletingLeadId === lead.id ? 'Deleting...' : 'Delete'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {isDetailsOpen && selectedLead && (
            <div className="fixed inset-0 z-50 flex justify-end">
              <button
                type="button"
                aria-label="Close lead details"
                className="absolute inset-0 bg-black/40"
                onClick={() => setIsDetailsOpen(false)}
              />

              <aside
                role="dialog"
                aria-modal="true"
                className="relative h-full w-full max-w-2xl border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-y-auto"
              >
                <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-950/95 backdrop-blur">
                  <div>
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                      Lead Details
                    </h2>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {selectedLead.name}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsDetailsOpen(false)}
                    className="inline-flex items-center justify-center size-8 rounded border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                <div className="p-6 space-y-5">
                  <div className="grid sm:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-zinc-500 dark:text-zinc-400">Name</p>
                      <p className="text-zinc-900 dark:text-zinc-100">
                        {selectedLead.name}
                      </p>
                    </div>
                    <div>
                      <p className="text-zinc-500 dark:text-zinc-400">Email</p>
                      <p className="text-zinc-900 dark:text-zinc-100">
                        {selectedLead.email}
                      </p>
                    </div>
                    <div>
                      <p className="text-zinc-500 dark:text-zinc-400">Phone</p>
                      <p className="text-zinc-900 dark:text-zinc-100">
                        {selectedLead.phone}
                      </p>
                    </div>
                    <div>
                      <p className="text-zinc-500 dark:text-zinc-400">
                        Lead Status
                      </p>
                      <div className="mt-1">
                        <select
                          value={selectedLead.leadStatus}
                          disabled={updatingLeadId === selectedLead.id}
                          onChange={(event) =>
                            handleLeadStatusChange(
                              selectedLead.id,
                              event.target.value
                            )
                          }
                          className={`w-full rounded-lg border px-3 py-2 text-sm bg-white dark:bg-zinc-900 ${
                            leadStatusStyles[selectedLead.leadStatus] ||
                            leadStatusStyles.NEW
                          } ${
                            updatingLeadId === selectedLead.id
                              ? 'opacity-60 cursor-not-allowed'
                              : 'border-zinc-300 dark:border-zinc-700'
                          }`}
                        >
                          {leadStatusOptions.map((status) => (
                            <option key={status} value={status}>
                              {formatLeadStatus(status)}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div>
                      <p className="text-zinc-500 dark:text-zinc-400">
                        Business Model
                      </p>
                      <p className="text-zinc-900 dark:text-zinc-100">
                        {selectedLead.businessModel}
                      </p>
                    </div>
                    <div>
                      <p className="text-zinc-500 dark:text-zinc-400">Source</p>
                      <p className="text-zinc-900 dark:text-zinc-100">
                        {selectedLead.sourceKey}
                      </p>
                    </div>
                    <div>
                      <p className="text-zinc-500 dark:text-zinc-400">
                        Submitted
                      </p>
                      <p className="text-zinc-900 dark:text-zinc-100">
                        {formatDateTime(selectedLead.submittedAt)}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-zinc-500 dark:text-zinc-400 text-sm">
                      Biggest Bottleneck
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-900 dark:text-zinc-100">
                      {selectedLead.biggestBottleneck}
                    </p>
                  </div>

                  <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/60 p-4 space-y-3">
                    <div>
                      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        Conversion History
                      </p>
                      <p className="text-sm text-zinc-600 dark:text-zinc-300 mt-1">
                        Track whether this lead has already been converted into downstream records.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] ${
                          selectedLeadClient
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200'
                            : 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                        }`}
                      >
                        {selectedLeadClient ? 'Client created' : 'Client not created'}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] ${
                          selectedLeadProjects.length > 0
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-200'
                            : 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                        }`}
                      >
                        {selectedLeadProjects.length > 0
                          ? `${selectedLeadProjects.length} project${selectedLeadProjects.length > 1 ? 's' : ''} created`
                          : 'No projects created'}
                      </span>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-zinc-500 dark:text-zinc-400">Linked Client</p>
                        <p className="text-zinc-900 dark:text-zinc-100 mt-1">
                          {selectedLeadClient?.name || 'Not created yet'}
                        </p>
                      </div>
                      <div>
                        <p className="text-zinc-500 dark:text-zinc-400">Latest Project</p>
                        <p className="text-zinc-900 dark:text-zinc-100 mt-1">
                          {selectedLeadLatestProject?.name || 'Not created yet'}
                        </p>
                      </div>
                    </div>

                    {(selectedLeadClient || selectedLeadLatestProject) && (
                      <div className="flex flex-col sm:flex-row gap-2">
                        {selectedLeadClient && (
                          <button
                            type="button"
                            onClick={() => navigate(`/clients/${selectedLeadClient.id}`)}
                            className="px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 text-sm text-zinc-800 dark:text-zinc-100"
                          >
                            View Client
                          </button>
                        )}
                        {selectedLeadLatestProject && (
                          <button
                            type="button"
                            onClick={() => navigate(`/projects/${selectedLeadLatestProject.id}`)}
                            className="px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 text-sm text-zinc-800 dark:text-zinc-100"
                          >
                            View Project
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {(selectedLead.leadStatus === 'QUALIFIED' ||
                    selectedLead.leadStatus === 'WON') && (
                    <div className="rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/70 dark:bg-blue-950/30 p-4 space-y-3">
                      <div>
                        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                          Conversion Actions
                        </p>
                        <p className="text-sm text-zinc-600 dark:text-zinc-300 mt-1">
                          {selectedLead.leadStatus === 'QUALIFIED'
                            ? 'This lead is qualified and ready to be converted into a client.'
                            : 'This lead is won and ready for client conversion and project kickoff.'}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="rounded-full bg-white/80 dark:bg-zinc-900 px-2.5 py-1 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-800">
                          {selectedLeadClient
                            ? `Client ready: ${selectedLeadClient.name}`
                            : 'No client created yet'}
                        </span>
                        <span className="rounded-full bg-white/80 dark:bg-zinc-900 px-2.5 py-1 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-800">
                          {selectedLeadLatestProject
                            ? `Project ready: ${selectedLeadLatestProject.name}`
                            : 'No project created yet'}
                        </span>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2">
                        {!selectedLeadClient && (
                          <button
                            type="button"
                            disabled={convertingLeadId === selectedLead.id}
                            onClick={() => handleCreateClientFromLead(selectedLead)}
                            className="px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 text-sm text-zinc-800 dark:text-zinc-100 disabled:opacity-60"
                          >
                            {convertingLeadId === selectedLead.id
                              ? 'Creating Client...'
                              : 'Create Client'}
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={
                            convertingLeadId === selectedLead.id ||
                            Boolean(selectedLeadLatestProject)
                          }
                          onClick={() => handleCreateProjectFromLead(selectedLead)}
                          className="px-4 py-2 rounded-lg bg-linear-to-br from-blue-500 to-blue-600 text-white text-sm disabled:opacity-60"
                        >
                          {selectedLeadLatestProject
                            ? 'Project Created'
                            : convertingLeadId === selectedLead.id
                            ? 'Preparing...'
                            : selectedLeadClient
                              ? 'Create Project'
                              : 'Create Client & Project'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </aside>
            </div>
          )}
        </>
      )}

      {showProjectDialog && (
        <CreateProjectDialog
          isDialogOpen={showProjectDialog}
          setIsDialogOpen={setShowProjectDialog}
          initialData={projectInitialData}
        />
      )}

      {activeTab === 'resources' && (
        <div className="space-y-4">
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-4">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Upload Lead File Resource
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Add a name (example: `n8n`) and upload a file. Use that name in
              your simple lead link as `src=n8n`.
            </p>

            <div className="grid md:grid-cols-[1fr_auto] gap-3">
              <input
                value={resourceName}
                onChange={(event) => setResourceName(event.target.value)}
                disabled={uploadingResource}
                placeholder="Resource name (e.g. n8n, workflow, crm)"
                className="w-full text-sm px-3 py-2 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900"
              />
              <label
                className={`inline-flex items-center justify-center gap-2 px-4 py-2 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg text-sm text-zinc-600 dark:text-zinc-300 ${
                  uploadingResource
                    ? 'cursor-not-allowed pointer-events-none opacity-60'
                    : 'cursor-pointer'
                }`}
              >
                <UploadCloudIcon className="size-4" />
                {uploadingResource
                  ? `Uploading ${uploadProgress}%`
                  : 'Select file'}
                <input
                  type="file"
                  onChange={handleUploadResource}
                  disabled={uploadingResource}
                  className="hidden"
                />
              </label>
            </div>

            {uploadingResource && (
              <div className="space-y-1">
                <div className="h-2 w-full rounded bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all duration-150"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Uploading... {uploadProgress}%
                </p>
              </div>
            )}

            {resourceName.trim() && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Source key preview: `{normalizeSourceKey(resourceName)}`
              </p>
            )}
          </div>

          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Uploaded Lead Resources
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-zinc-50 dark:bg-zinc-900/70">
                  <tr className="text-left text-zinc-500 dark:text-zinc-400">
                    <th className="px-4 py-3 font-medium">Label</th>
                    <th className="px-4 py-3 font-medium">Source Key</th>
                    <th className="px-4 py-3 font-medium">File</th>
                    <th className="px-4 py-3 font-medium">Updated</th>
                    <th className="px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {!resourcesLoading && leadResources.length === 0 && (
                    <tr>
                      <td
                        className="px-4 py-6 text-zinc-500 dark:text-zinc-400"
                        colSpan={5}
                      >
                        No resources uploaded yet.
                      </td>
                    </tr>
                  )}
                  {leadResources.map((resource) => (
                    <tr
                      key={resource.id}
                      className="border-t border-zinc-100 dark:border-zinc-800"
                    >
                      <td className="px-4 py-3 text-zinc-900 dark:text-zinc-100">
                        {resource.label || resource.sourceKey}
                      </td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">
                        {resource.sourceKey}
                      </td>
                      <td className="px-4 py-3">
                        <a
                          href={buildOpenUrl(resource)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 dark:text-blue-300 hover:underline break-all"
                        >
                          Open file
                        </a>
                      </td>
                      <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">
                        {formatDateTime(resource.updatedAt || resource.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              copyText(
                                buildSimpleLeadLinkWithSource(
                                  simpleLeadFormUrl,
                                  resource.sourceKey
                                ),
                                `Copied link for src "${resource.sourceKey}"`
                              )
  }
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs rounded border border-zinc-300 dark:border-zinc-700"
                          >
                            <Copy className="size-3.5" />
                            Copy link
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteResource(resource)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs rounded border border-red-300 text-red-700 dark:border-red-800 dark:text-red-300"
                          >
                            <Trash2 className="size-3.5" />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Leads;
