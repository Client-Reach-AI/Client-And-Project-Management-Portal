import { useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useWorkspaceContext } from '../context/workspaceContext';
import { useInvoicesByWorkspace } from '../hooks/useQueries';
import { useCreateInvoiceCheckoutSession } from '../hooks/useMutations';

const statusStyles = {
  DRAFT: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-700/30 dark:text-zinc-200',
  SENT: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200',
  PARTIALLY_PAID:
    'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-200',
  PAID: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200',
  VOID: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-200',
};

const formatMoney = (amountCents, currency = 'USD') =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format((Number(amountCents || 0) || 0) / 100);

const formatDate = (value) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString();
};

const ClientInvoices = () => {
  const [searchParams] = useSearchParams();
  const { currentWorkspace } = useWorkspaceContext();
  const workspaceId = currentWorkspace?.id || null;

  const { data: invoices = [], isLoading } = useInvoicesByWorkspace(workspaceId, {
    enabled: Boolean(workspaceId),
    refetchInterval: 15000,
  });

  const checkoutMutation = useCreateInvoiceCheckoutSession();

  const checkoutState = searchParams.get('checkout');

  useEffect(() => {
    if (checkoutState === 'success') {
      toast.success('Payment completed successfully.');
    }
    if (checkoutState === 'cancel') {
      toast('Payment cancelled.');
    }
  }, [checkoutState]);

  const sortedInvoices = useMemo(
    () =>
      [...invoices].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    [invoices]
  );

  const onPayInvoice = async (invoiceId) => {
    try {
      const response = await checkoutMutation.mutateAsync({ invoiceId });
      if (!response?.url) throw new Error('Missing Stripe checkout URL');
      window.location.href = response.url;
    } catch (error) {
      toast.error(error.message || 'Could not start checkout');
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-zinc-400">
          Client Portal
        </p>
        <h1 className="text-2xl sm:text-3xl font-semibold text-zinc-900 dark:text-white mt-2">
          Invoices
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">
          Review and securely pay your invoices through Stripe.
        </p>
      </div>

      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6">
        {isLoading ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading invoices...</p>
        ) : !sortedInvoices.length ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">No invoices yet.</p>
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
                  <th className="pb-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {sortedInvoices.map((invoice) => {
                  const isPayable = !['PAID', 'VOID'].includes(invoice.status);
                  return (
                    <tr key={invoice.id}>
                      <td className="py-3 text-zinc-900 dark:text-zinc-100">
                        {invoice.invoiceNumber}
                      </td>
                      <td className="py-3 text-zinc-600 dark:text-zinc-300">
                        {invoice.title}
                      </td>
                      <td className="py-3 text-zinc-600 dark:text-zinc-300">
                        {formatMoney(invoice.amountCents, invoice.currency)}
                      </td>
                      <td className="py-3 text-zinc-600 dark:text-zinc-300">
                        {formatDate(invoice.dueDate)}
                      </td>
                      <td className="py-3">
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            statusStyles[invoice.status] || statusStyles.SENT
                          }`}
                        >
                          {invoice.status}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        {isPayable ? (
                          <button
                            type="button"
                            onClick={() => onPayInvoice(invoice.id)}
                            className="text-xs px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60"
                            disabled={checkoutMutation.isPending}
                          >
                            Pay Now
                          </button>
                        ) : (
                          <span className="text-xs text-zinc-500 dark:text-zinc-400">Completed</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientInvoices;
