import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setAuth } from '../features/authSlice';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useLogin } from '../hooks/useMutations';

const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { mutateAsync: login, isPending } = useLogin();
  const [formData, setFormData] = useState({
    email: 'admin@admin.com',
    password: 'Password123',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const result = await login({
        email: formData.email,
        password: formData.password,
      });
      if (result?.token) {
        dispatch(setAuth(result));
        toast.success('Logged in successfully');
        navigate('/');
      }
    } catch (error) {
      toast.error(error?.message || 'Login failed');
    }
  };

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white">
            Sign in
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Use the admin credentials to access the dashboard.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-zinc-600 dark:text-zinc-400">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
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
            {isPending ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
