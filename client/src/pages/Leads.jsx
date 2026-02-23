import { useEffect, useMemo, useState } from 'react';
import { Copy, LinkIcon, UploadCloudIcon, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSelector } from 'react-redux';
import { useWorkspaceContext } from '../context/workspaceContext';
import { useClientIntakes, useLeadResources } from '../hooks/useQueries';
import {
  useCreateFileSignature,
  useCreateLeadResource,
} from '../hooks/useMutations';

const getLeadName = (payload = {}) =>
  payload.name ||
  payload.contact_name ||
  payload.clientName ||
  payload.company_name ||
  payload.company ||
  'Unknown';

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

const Leads = () => {
  const user = useSelector((state) => state.auth.user);
  const { currentWorkspace } = useWorkspaceContext();
  const memberRole = currentWorkspace?.members?.find(
    (member) => member.user.id === user?.id
  )?.role;
  const isAdmin = user?.role === 'ADMIN' || memberRole === 'ADMIN';

  const workspaceId = currentWorkspace?.id || null;

  const { data: intakes = [] } = useClientIntakes(workspaceId, {
    enabled: Boolean(workspaceId && isAdmin),
  });
  const { data: leadResources = [], isLoading: resourcesLoading } =
    useLeadResources(workspaceId, {
      enabled: Boolean(workspaceId && isAdmin),
    });
  const { mutateAsync: createSignature } = useCreateFileSignature();
  const { mutateAsync: createLeadResource } = useCreateLeadResource();

  const [activeTab, setActiveTab] = useState('leads');
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const [resourceName, setResourceName] = useState('');
  const [uploadingResource, setUploadingResource] = useState(false);

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
          email: payload.email || 'N/A',
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
      const uploadResponse = await fetch(
        `https://api.cloudinary.com/v1_1/${signature.cloudName}/${resourceType}/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      const uploaded = await uploadResponse.json();
      if (!uploadResponse.ok || uploaded?.error) {
        throw new Error(uploaded?.error?.message || 'Upload failed');
      }

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
      event.target.value = '';
    }
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

      {activeTab === 'leads' && (
        <>
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
                    <th className="px-4 py-3 font-medium">Business Model</th>
                    <th className="px-4 py-3 font-medium">Source (src)</th>
                    <th className="px-4 py-3 font-medium">Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.length === 0 && (
                    <tr>
                      <td
                        className="px-4 py-6 text-zinc-500 dark:text-zinc-400"
                        colSpan={5}
                      >
                        No leads submitted yet.
                      </td>
                    </tr>
                  )}
                  {leads.map((lead) => (
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
                        {lead.name}
                      </td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">
                        {lead.email}
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
                    </tr>
                  ))}
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
                </div>
              </aside>
            </div>
          )}
        </>
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
                placeholder="Resource name (e.g. n8n, workflow, crm)"
                className="w-full text-sm px-3 py-2 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900"
              />
              <label className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg text-sm text-zinc-600 dark:text-zinc-300 cursor-pointer">
                <UploadCloudIcon className="size-4" />
                {uploadingResource ? 'Uploading...' : 'Select file'}
                <input
                  type="file"
                  onChange={handleUploadResource}
                  disabled={uploadingResource}
                  className="hidden"
                />
              </label>
            </div>

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
                    <th className="px-4 py-3 font-medium">Action</th>
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
                        <button
                          type="button"
                          onClick={() =>
                            copyText(
                              resource.sourceKey,
                              `Copied src "${resource.sourceKey}"`
                            )
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs rounded border border-zinc-300 dark:border-zinc-700"
                        >
                          <Copy className="size-3.5" />
                          Copy src
                        </button>
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
