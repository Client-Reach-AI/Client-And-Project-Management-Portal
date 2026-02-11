import { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useMessages } from '../hooks/useQueries';
import { useCreateMessage } from '../hooks/useMutations';

const formatTimestamp = (value) => {
  if (!value) return 'Just now';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Just now';
  return format(date, 'MMM d, yyyy h:mm a');
};

const MessageThread = ({
  workspaceId,
  emptyMessage = 'No messages yet.',
  className = '',
}) => {
  const user = useSelector((state) => state.auth.user);
  const [draft, setDraft] = useState('');

  const {
    data: messages = [],
    isLoading,
    isError,
    error,
  } = useMessages(workspaceId, {
    enabled: Boolean(workspaceId),
  });
  const { mutateAsync: createMessage, isPending } = useCreateMessage();

  const orderedMessages = useMemo(() => {
    if (!messages.length) return [];
    return [...messages].sort((a, b) =>
      new Date(a.createdAt).getTime() > new Date(b.createdAt).getTime() ? 1 : -1
    );
  }, [messages]);

  const handleSend = async (event) => {
    event.preventDefault();
    if (!workspaceId) return;

    const trimmed = draft.trim();
    if (!trimmed) {
      toast.error('Message cannot be empty');
      return;
    }

    try {
      await createMessage({ workspaceId, body: trimmed });
      setDraft('');
    } catch (err) {
      toast.error(err?.message || 'Failed to send message');
    }
  };

  if (!workspaceId) {
    return (
      <div
        className={`rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 ${className}`}
      >
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Messages are unavailable until a client portal workspace is linked.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 space-y-5 ${className}`}
    >
      <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
        {isLoading && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Loading messages...
          </p>
        )}
        {isError && (
          <p className="text-sm text-red-500">
            {error?.message || 'Failed to load messages'}
          </p>
        )}
        {!isLoading && !isError && !orderedMessages.length && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {emptyMessage}
          </p>
        )}
        {orderedMessages.map((message) => {
          const isMine = message.sender?.id === user?.id;
          const senderLabel = isMine
            ? 'You'
            : message.sender?.name || message.sender?.email || 'Team';

          return (
            <div
              key={message.id}
              className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[75%] rounded-lg px-4 py-3 text-sm shadow-sm ${
                  isMine
                    ? 'bg-blue-600 text-white'
                    : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100'
                }`}
              >
                <div
                  className={`flex items-center justify-between gap-3 text-xs ${
                    isMine
                      ? 'text-blue-100'
                      : 'text-zinc-500 dark:text-zinc-400'
                  }`}
                >
                  <span>{senderLabel}</span>
                  <span>{formatTimestamp(message.createdAt)}</span>
                </div>
                <p className="mt-2 whitespace-pre-wrap break-words">
                  {message.body}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <form onSubmit={handleSend} className="flex flex-col gap-3">
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Write a message..."
          rows={3}
          className="w-full resize-none rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100"
        />
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isPending}
            className="px-4 py-2 rounded bg-linear-to-br from-blue-500 to-blue-600 text-white text-sm disabled:opacity-60"
          >
            {isPending ? 'Sending...' : 'Send message'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default MessageThread;
