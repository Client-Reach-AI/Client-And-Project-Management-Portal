import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { acceptInvitation, lookupInvitation } from '../api';
import toast from 'react-hot-toast';
import { useDispatch } from 'react-redux';
import { loginThunk } from '../features/authSlice';

const AcceptInvite = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    password: '',
  });

  useEffect(() => {
    const loadInvite = async () => {
      if (!token) {
        toast.error('Invalid invite link');
        setLoading(false);
        return;
      }

      try {
        const data = await lookupInvitation(token);
        setInvite(data);
        setLoading(false);
      } catch (error) {
        toast.error(error?.message || 'Invite not found');
        setLoading(false);
      }
    };

    loadInvite();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const result = await acceptInvitation({
        token,
        password: formData.password,
        name: formData.name,
      });
      if (result?.token) {
        toast.success('Account created');
        await dispatch(
          loginThunk({ email: result.user.email, password: formData.password })
        ).unwrap();
        navigate('/');
      }
    } catch (error) {
      toast.error(error?.message || 'Failed to accept invite');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  if (!invite) {
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
            className="w-full px-4 py-2 rounded bg-linear-to-br from-blue-500 to-blue-600 text-white text-sm"
          >
            Create Account
          </button>
        </form>
      </div>
    </div>
  );
};

export default AcceptInvite;
