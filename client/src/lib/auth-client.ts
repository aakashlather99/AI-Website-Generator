import api from '../services/api';

// Custom auth client that matches the backend API
export const authClient = {
  signIn: {
    email: async ({ email, password }: { email: string; password: string }) => {
      try {
        const response = await api.post('/api/auth/login', { email, password });
        return { data: response.data, error: null };
      } catch (err: any) {
        return {
          data: null,
          error: {
            message: err.response?.data?.message || 'Login failed',
          },
        };
      }
    },
  },
  signUp: {
    email: async ({ email, password, name }: { email: string; password: string; name: string }) => {
      try {
        const response = await api.post('/api/auth/register', { email, password, name });
        return { data: response.data, error: null };
      } catch (err: any) {
        return {
          data: null,
          error: {
            message: err.response?.data?.message || 'Registration failed',
          },
        };
      }
    },
  },
  getSession: async () => {
    try {
      const response = await api.get('/api/auth/me');
      return {
        data: {
          session: true,
          user: response.data.user,
        },
      };
    } catch {
      return {
        data: {
          session: null,
          user: null,
        },
      };
    }
  },
  signOut: async () => {
    try {
      await api.post('/api/auth/logout', {});
    } catch {
      // silent
    }
  },
};
