import { useWorkspaceContext } from '../context/workspaceContext';
import MessageThread from '../components/MessageThread';

const ClientMessages = () => {
  const { currentWorkspace } = useWorkspaceContext();

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-zinc-400">
          Client Portal
        </p>
        <h1 className="text-2xl sm:text-3xl font-semibold text-zinc-900 dark:text-white mt-2">
          Messages
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">
          Keep the conversation going with your delivery team.
        </p>
      </div>

      <MessageThread
        workspaceId={currentWorkspace?.id}
        emptyMessage="No messages yet. Start the conversation."
      />
    </div>
  );
};

export default ClientMessages;
