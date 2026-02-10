const messages = [
  {
    id: 'msg-1',
    title: 'Kickoff recap',
    body: 'We aligned on milestones and will share the first wireframes next week.',
    date: 'Feb 08, 2026',
  },
  {
    id: 'msg-2',
    title: 'Assets request',
    body: 'Please upload any brand assets and references to the Files & Links tab.',
    date: 'Feb 05, 2026',
  },
];

const ClientMessages = () => (
  <div className="w-full max-w-6xl mx-auto space-y-6">
    <div>
      <p className="text-xs uppercase tracking-[0.3em] text-zinc-400">
        Client Portal
      </p>
      <h1 className="text-2xl sm:text-3xl font-semibold text-zinc-900 dark:text-white mt-2">
        Messages
      </h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">
        Messages are visible here for now. Real-time messaging is next.
      </p>
    </div>

    <div className="space-y-4">
      {messages.map((message) => (
        <div
          key={message.id}
          className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
              {message.title}
            </h3>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {message.date}
            </span>
          </div>
          <p className="text-sm text-zinc-600 dark:text-zinc-300 mt-2">
            {message.body}
          </p>
        </div>
      ))}
    </div>
  </div>
);

export default ClientMessages;
