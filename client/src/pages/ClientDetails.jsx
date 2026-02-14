import { useMemo, useState } from 'react';
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import { ArrowLeftIcon, Link as LinkIcon } from 'lucide-react';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { useWorkspaceContext } from '../context/workspaceContext';
import { useClients, useInvoicesByClient, useSharedFiles } from '../hooks/useQueries';
import { useCreateInvoice, useUpdateInvoice } from '../hooks/useMutations';
import MessageThread from '../components/MessageThread';

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

const invoiceStatusStyles = {
  DRAFT:
    'bg-zinc-100 text-zinc-700 dark:bg-zinc-700/30 dark:text-zinc-200',
  SENT:
    'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200',
  PARTIALLY_PAID:
    'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-200',
  PAID: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200',
  VOID: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-200',
};

const formatCurrency = (amountCents, currency = 'USD') =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format((Number(amountCents || 0) || 0) / 100);

const formatShortDate = (value) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString();
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
  const { data: invoiceList = [], isLoading: invoicesLoading } =
    useInvoicesByClient(client?.id, {
      enabled: Boolean(client?.id && isAdmin),
      refetchInterval: 15000,
    });
  const createInvoiceMutation = useCreateInvoice();
  const updateInvoiceMutation = useUpdateInvoice();
  const [invoiceDraft, setInvoiceDraft] = useState({
    title: '',
    description: '',
    amount: '',
    dueDate: '',
    status: 'SENT',
  });

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

  const onCreateInvoice = async (event) => {
    event.preventDefault();
    try {
      await createInvoiceMutation.mutateAsync({
        clientId: client.id,
        title: invoiceDraft.title,
        description: invoiceDraft.description || null,
        amount: Number(invoiceDraft.amount),
        dueDate: invoiceDraft.dueDate || null,
        status: invoiceDraft.status,
      });
      setInvoiceDraft({
        title: '',
        description: '',
        amount: '',
        dueDate: '',
        status: 'SENT',
      });
      toast.success('Invoice created');
    } catch (error) {
      toast.error(error.message || 'Could not create invoice');
    }
  };

  const onMarkPaid = async (invoiceId) => {
    try {
      await updateInvoiceMutation.mutateAsync({
        invoiceId,
        payload: { status: 'PAID' },
      });
      toast.success('Invoice marked as paid');
    } catch (error) {
      toast.error(error.message || 'Could not update invoice');
    }
  };

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
        <div className="space-y-5">
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
              Create Invoice
            </h3>
            <form
              onSubmit={onCreateInvoice}
              className="grid sm:grid-cols-2 gap-3 items-end"
            >
              <label className="space-y-1">
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  Title
                </span>
                <input
                  type="text"
                  required
                  value={invoiceDraft.title}
                  onChange={(e) =>
                    setInvoiceDraft((prev) => ({
                      ...prev,
                      title: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm"
                  placeholder="Phase 1 delivery"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  Amount (USD)
                </span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={invoiceDraft.amount}
                  onChange={(e) =>
                    setInvoiceDraft((prev) => ({
                      ...prev,
                      amount: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm"
                  placeholder="2500"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  Due Date
                </span>
                <input
                  type="date"
                  value={invoiceDraft.dueDate}
                  onChange={(e) =>
                    setInvoiceDraft((prev) => ({
                      ...prev,
                      dueDate: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  Status
                </span>
                <select
                  value={invoiceDraft.status}
                  onChange={(e) =>
                    setInvoiceDraft((prev) => ({
                      ...prev,
                      status: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm"
                >
                  <option value="DRAFT">DRAFT</option>
                  <option value="SENT">SENT</option>
                </select>
              </label>
              <label className="space-y-1 sm:col-span-2">
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  Description
                </span>
                <textarea
                  rows={3}
                  value={invoiceDraft.description}
                  onChange={(e) =>
                    setInvoiceDraft((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm"
                  placeholder="Optional notes for this invoice"
                />
              </label>
              <div className="sm:col-span-2">
                <button
                  type="submit"
                  disabled={createInvoiceMutation.isPending}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm disabled:opacity-60"
                >
                  {createInvoiceMutation.isPending
                    ? 'Creating...'
                    : 'Create Invoice'}
                </button>
              </div>
            </form>
          </div>

          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
              Invoice History
            </h3>
            {invoicesLoading ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Loading invoices...
              </p>
            ) : !invoiceList.length ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                No invoices yet for this client.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-[0.2em] text-zinc-500">
                      <th className="pb-3">Invoice</th>
                      <th className="pb-3">Title</th>
                      <th className="pb-3">Amount</th>
                      <th className="pb-3">Due</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {invoiceList.map((invoice) => (
                      <tr key={invoice.id}>
                        <td className="py-3 text-zinc-900 dark:text-zinc-100">
                          {invoice.invoiceNumber}
                        </td>
                        <td className="py-3 text-zinc-600 dark:text-zinc-300">
                          {invoice.title}
                        </td>
                        <td className="py-3 text-zinc-600 dark:text-zinc-300">
                          {formatCurrency(invoice.amountCents, invoice.currency)}
                        </td>
                        <td className="py-3 text-zinc-600 dark:text-zinc-300">
                          {formatShortDate(invoice.dueDate)}
                        </td>
                        <td className="py-3">
                          <span
                            className={`text-xs px-2 py-1 rounded-full ${
                              invoiceStatusStyles[invoice.status] ||
                              invoiceStatusStyles.SENT
                            }`}
                          >
                            {invoice.status}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          {invoice.status !== 'PAID' && invoice.status !== 'VOID' ? (
                            <button
                              type="button"
                              onClick={() => onMarkPaid(invoice.id)}
                              className="text-xs px-3 py-1.5 rounded-md border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                            >
                              Mark Paid
                            </button>
                          ) : (
                            <span className="text-xs text-zinc-500 dark:text-zinc-400">
                              -
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'messages' && (
        <MessageThread
          workspaceId={client.portalWorkspaceId}
          emptyMessage="No client messages yet."
        />
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
