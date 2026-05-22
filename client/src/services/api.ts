import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  timeout: 120000,
  // Enable automatic cookie sending with credentials
  withCredentials: true,
});

// Token refresh interceptor
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

    // Handle token expiration (401 with TOKEN_EXPIRED code)
    if (
      error.response?.status === 401 &&
      error.response?.data?.code === 'TOKEN_EXPIRED' &&
      !original._retry
    ) {
      original._retry = true;
      try {
        // Try to refresh the token (it's in httpOnly cookie)
        const { data } = await axios.post(
          `${import.meta.env.VITE_API_URL || ''}/api/auth/refresh`,
          {},
          { withCredentials: true }
        );

        if (data.success) {
          // New tokens are set as httpOnly cookies automatically by server
          return api(original);
        }
      } catch {
        // Refresh failed — dispatch custom event instead of hard redirect
        // This prevents full page reload which loses React state
        window.dispatchEvent(new CustomEvent('auth:session-expired'));
        setTimeout(() => {
          window.location.href = '/auth';
        }, 100);
        return Promise.reject(error);
      }
    }

    // Handle other 401 errors (not token expired) — only on non-auth endpoints
    if (
      error.response?.status === 401 &&
      !original._retry &&
      !original.url?.includes('/auth/')
    ) {
      // Don't redirect for auth/me failures — that's expected for logged-out users
      if (!original.url?.includes('/auth/me')) {
        window.location.href = '/auth';
      }
    }

    return Promise.reject(error);
  }
);

export default api;
