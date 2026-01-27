import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { login } from '../api';

const loadStoredAuth = () => {
  const token = localStorage.getItem('authToken');
  const rawUser = localStorage.getItem('authUser');
  return {
    token: token || null,
    user: rawUser ? JSON.parse(rawUser) : null,
  };
};

export const loginThunk = createAsyncThunk(
  'auth/login',
  async ({ email, password }) => {
    const result = await login({ email, password });
    return result;
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    token: null,
    loading: false,
    initialized: false,
  },
  reducers: {
    loadAuthFromStorage: (state) => {
      const stored = loadStoredAuth();
      state.user = stored.user;
      state.token = stored.token;
      state.initialized = true;
    },
    updateUser: (state, action) => {
      state.user = action.payload;
      localStorage.setItem('authUser', JSON.stringify(action.payload));
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.initialized = true;
      localStorage.removeItem('authToken');
      localStorage.removeItem('authUser');
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginThunk.pending, (state) => {
        state.loading = true;
      })
      .addCase(loginThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.initialized = true;
        localStorage.setItem('authToken', action.payload.token);
        localStorage.setItem('authUser', JSON.stringify(action.payload.user));
      })
      .addCase(loginThunk.rejected, (state) => {
        state.loading = false;
        state.initialized = true;
      });
  },
});

export const { loadAuthFromStorage, updateUser, logout } = authSlice.actions;
export default authSlice.reducer;
