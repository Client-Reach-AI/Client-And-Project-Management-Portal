const getAuthToken = () => localStorage.getItem('authToken');
const runtimeEnv = typeof window !== 'undefined' ? window.__ENV__ || {} : {};
const API_BASE_URL = (
  import.meta.env.VITE_API_URL ||
  runtimeEnv.VITE_API_URL ||
  ''
).replace(/\/$/, '');

export const apiFetch = async (path, options = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const token = getAuthToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const url = `${API_BASE_URL}${path}`;

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 204) return null;

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = data?.message || 'Request failed';
    throw new Error(message);
  }

  return data;
};
