import { useMemo } from 'react';
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import { ArrowLeftIcon, Link as LinkIcon } from 'lucide-react';
import { useSelector } from 'react-redux';
import { useWorkspaceContext } from '../context/workspaceContext';
import { useClients, useSharedFiles } from '../hooks/useQueries';

const tabs = [
  { id: 'summary', label: 'Summary' },
  { id: 'files', label: 'Files & Links' },
  { id: 'invoices', label: 'Invoices' },
  { id: 'messages', label: 'Messages' },
];

const statusStyles = {
  ACTIVE:
    'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200',
  INACTIVE: 'bg-zinc-200 text-zinc-700 dark:bg-zinc-700/40 dark:text-zinc-300',
};

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

const ensureUrl = (value) => {
  if (!value) return value;
  return value.startsWith('http') ? value : `https://${value}`;
};

const buildOpenUrl = (item) => {
  const url = ensureUrl(item?.url);
  if (!url) return url;
  if (item?.mimeType?.includes('pdf') && url.includes('/image/upload/')) {
    return url.replace('/image/upload/', '/raw/upload/');
  }
  return url;
};

const buildDownloadUrl = (item) => {
  const url = buildOpenUrl(item);
  if (!url) return url;
  return url.includes('/upload/')
    ? url.replace('/upload/', '/upload/fl_attachment/')
    : url;
};

const ClientDetails = () => {
  const { currentWorkspace } = useWorkspaceContext();
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);
  const memberRole = currentWorkspace?.members?.find(
    (member) => member.user.id === user?.id
  )?.role;
  const isAdmin = user?.role === 'ADMIN' || memberRole === 'ADMIN';

  const activeTab = searchParams.get('tab') || 'summary';
  const workspaceId = currentWorkspace?.id || null;
  const { data: clients = [] } = useClients(workspaceId);

  const client = useMemo(
    () => clients.find((item) => item.id === id),
    [clients, id]
  );

  const { data: files = [] } = useSharedFiles(
    {
      workspaceId,
      clientId: client?.id,
    },
    { enabled: Boolean(workspaceId && client?.id) }
  );

  const projectCount = useMemo(() => {
    if (!client) return 0;
    return (
      currentWorkspace?.projects?.filter(
        (project) => project.clientId === client.id
      ).length || 0
    );
  }, [client, currentWorkspace]);

  if (!client) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <button
          type="button"
          onClick={() => navigate('/clients')}
          className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-800"
        >
          <ArrowLeftIcon className="size-4" /> Back to Clients
        </button>
        <div className="mt-6 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Client not found.
          </p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="p-6 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-200">
        <h2 className="text-xl font-semibold">Client Access</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">
          Only workspace admins can view client details.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col gap-4">
        <button
          type="button"
          onClick={() => navigate('/clients')}
          className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          <ArrowLeftIcon className="size-4" /> Back to Clients
        </button>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white">
              {client.name}
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {client.company || client.industry || 'Client'}
            </p>
          </div>
          <span
            className={`text-xs px-3 py-1 rounded-full ${
              statusStyles[client.status] || statusStyles.ACTIVE
            }`}
          >
            {client.status || 'ACTIVE'}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-zinc-200 dark:border-zinc-800">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSearchParams({ tab: tab.id })}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'summary' && (
        <div className="space-y-5">
          <div className="grid sm:grid-cols-3 gap-3">
            {[
              { label: 'Projects', value: projectCount },
              {
                label: 'Uploaded files',
                value:
                  client.uploadedFiles?.length ||
                  client.details?.uploadedFiles?.length ||
                  files.length ||
                  0,
              },
              { label: 'Portal workspace', value: client.portalWorkspaceId },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4"
              >
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {stat.label}
                </p>
                <p className="text-lg font-semibold text-zinc-900 dark:text-white">
                  {stat.value || 'N/A'}
                </p>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 p-5">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
              Contact
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              <DetailItem label="Name" value={client.name} />
              <DetailItem label="Company" value={client.company} />
              <DetailItem label="Email" value={client.email} />
              <DetailItem label="Phone" value={client.phone} />
              <DetailItem label="Website" value={client.website} />
              <DetailItem label="Industry" value={client.industry} />
            </div>
          </div>

          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 p-5">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
              Project Preferences
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              <DetailItem
                label="Primary Contact"
                value={client.contactName || client.details?.contactName}
              />
              <DetailItem
                label="Contact Role"
                value={client.contactRole || client.details?.contactRole}
              />
              <DetailItem label="Address" value={client.details?.address} />
              <DetailItem
                label="Goals"
                value={client.details?.goals}
                multiline
              />
              <DetailItem label="Budget" value={client.details?.budget} />
              <DetailItem label="Timeline" value={client.details?.timeline} />
              <DetailItem
                label="Audience"
                value={client.details?.targetAudience}
                multiline
              />
            </div>
          </div>

          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 p-5">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
              Notes
            </p>
            <DetailItem label="Notes" value={client.details?.notes} multiline />
          </div>
        </div>
      )}

      {activeTab === 'files' && (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 space-y-3">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
              Files & Links
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Files uploaded in the client portal appear here.
            </p>
          </div>
          {files.length ? (
            <div className="space-y-3">
              {files.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between border border-zinc-200 dark:border-zinc-800 rounded-lg p-3"
                >
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {item.name}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {item.type === 'FILE' ? 'File' : 'Link'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <a
                      href={buildDownloadUrl(item)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs inline-flex items-center gap-1 text-zinc-600 dark:text-zinc-300 hover:underline"
                    >
                      <LinkIcon className="size-3" /> Download
                    </a>
                    <a
                      href={buildOpenUrl(item)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      <LinkIcon className="size-3" /> Open
                    </a>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              No files shared yet.
            </p>
          )}
        </div>
      )}

      {activeTab === 'invoices' && (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Invoices are a placeholder for now. We will wire billing later.
          </p>
        </div>
      )}

      {activeTab === 'messages' && (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Messages are coming soon. Use project notes for now.
          </p>
        </div>
      )}

      {client.portalWorkspaceId && (
        <div className="text-xs text-zinc-500 dark:text-zinc-400">
          Client portal workspace: {client.portalWorkspaceId}
        </div>
      )}
      {client.portalProjectId && (
        <Link
          to={`/projectsDetail?id=${client.portalProjectId}`}
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
        >
          View portal project
        </Link>
      )}
    </div>
  );
};

export default ClientDetails;
