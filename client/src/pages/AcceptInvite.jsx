import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useDispatch } from 'react-redux';
import { setAuth } from '../features/authSlice';
import { useInvitationLookup } from '../hooks/useQueries';
import {
  useAcceptInvitation,
  useDeclineInvitation,
} from '../hooks/useMutations';

const AcceptInvite = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const token = searchParams.get('token');
  const {
    data: invite,
    isLoading,
    isError,
  } = useInvitationLookup(token, {
    enabled: Boolean(token),
    retry: false,
  });
  const { mutateAsync: acceptInvite, isPending } = useAcceptInvitation();
  const { mutateAsync: declineInvite, isPending: declinePending } =
    useDeclineInvitation();
  const [formData, setFormData] = useState({
    name: '',
    password: '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = invite?.userExists
        ? { token }
        : {
            token,
            password: formData.password,
            name: formData.name,
          };

      const result = await acceptInvite(payload);

      if (result?.existingUser) {
        toast.success('Invitation accepted. Please sign in.');
        navigate('/login');
        return;
      }

      if (result?.token) {
        toast.success('Account created');
        dispatch(setAuth(result));
        navigate('/');
      }
    } catch (error) {
      toast.error(error?.message || 'Failed to accept invite');
    }
  };

  const handleDecline = async () => {
    try {
      await declineInvite({ token });
      toast.success('Invitation declined');
      navigate('/login');
    } catch (error) {
      toast.error(error?.message || 'Failed to decline invite');
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Invalid invite link.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  if (isError || !invite) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Invite invalid.
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow p-6">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white">
          Accept Invitation
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          {invite.email} invited as {invite.role}
        </p>

        {invite.userExists ? (
          <div className="space-y-4 mt-6">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              This email already has an account. Accept to join the workspace or
              decline the invitation.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleDecline}
                disabled={declinePending || isPending}
                className="flex-1 px-4 py-2 rounded border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-200 text-sm"
              >
                {declinePending ? 'Declining...' : 'Decline'}
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isPending || declinePending}
                className="flex-1 px-4 py-2 rounded bg-linear-to-br from-blue-500 to-blue-600 text-white text-sm"
              >
                {isPending ? 'Accepting...' : 'Accept'}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 mt-6">
            <div>
              <label className="text-sm text-zinc-600 dark:text-zinc-400">
                Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full mt-2 px-3 py-2 rounded border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 text-sm text-zinc-900 dark:text-zinc-200"
                required
              />
            </div>

            <div>
              <label className="text-sm text-zinc-600 dark:text-zinc-400">
                Password
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                className="w-full mt-2 px-3 py-2 rounded border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 text-sm text-zinc-900 dark:text-zinc-200"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full px-4 py-2 rounded bg-linear-to-br from-blue-500 to-blue-600 text-white text-sm"
            >
              {isPending ? 'Creating...' : 'Create Account'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default AcceptInvite;
