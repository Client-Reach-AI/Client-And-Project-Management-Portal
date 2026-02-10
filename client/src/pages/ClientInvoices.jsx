const invoices = [
  {
    id: 'INV-1201',
    title: 'Discovery + Strategy',
    amount: '$2,500',
    status: 'Pending',
    due: 'Mar 12, 2026',
  },
  {
    id: 'INV-1189',
    title: 'Phase 1 Delivery',
    amount: '$7,200',
    status: 'Paid',
    due: 'Feb 01, 2026',
  },
  {
    id: 'INV-1173',
    title: 'Monthly Support',
    amount: '$1,200',
    status: 'Scheduled',
    due: 'Feb 25, 2026',
  },
];

const statusStyles = {
  Pending:
    'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200',
  Paid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200',
  Scheduled: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-200',
};

const ClientInvoices = () => (
  <div className="w-full max-w-6xl mx-auto space-y-6">
    <div>
      <p className="text-xs uppercase tracking-[0.3em] text-zinc-400">
        Client Portal
      </p>
      <h1 className="text-2xl sm:text-3xl font-semibold text-zinc-900 dark:text-white mt-2">
        Invoices
      </h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">
        A dummy invoice list for now. We will wire billing later.
      </p>
    </div>

    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-[0.2em] text-zinc-500">
              <th className="pb-3">Invoice</th>
              <th className="pb-3">Title</th>
              <th className="pb-3">Amount</th>
              <th className="pb-3">Status</th>
              <th className="pb-3">Due</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {invoices.map((invoice) => (
              <tr key={invoice.id}>
                <td className="py-3 text-zinc-900 dark:text-zinc-100">
                  {invoice.id}
                </td>
                <td className="py-3 text-zinc-600 dark:text-zinc-300">
                  {invoice.title}
                </td>
                <td className="py-3 text-zinc-600 dark:text-zinc-300">
                  {invoice.amount}
                </td>
                <td className="py-3">
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      statusStyles[invoice.status]
                    }`}
                  >
                    {invoice.status}
                  </span>
                </td>
                <td className="py-3 text-zinc-600 dark:text-zinc-300">
                  {invoice.due}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);

export default ClientInvoices;
