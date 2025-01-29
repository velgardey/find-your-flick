import { auth } from './firebase';
import { fetchWithRetry } from './retryUtils';

export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export async function fetchWithAuth<T = unknown>(url: string, options: RequestInit = {}): Promise<T> {
  // Wait for auth to initialize
  await new Promise((resolve) => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      unsubscribe();
      resolve(user);
    });
  });

  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new AuthenticationError('User not authenticated');
  }

  try {
    // Force token refresh
    const token = await currentUser.getIdToken(true);
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    };

    const response = await fetchWithRetry(url, {
      ...options,
      headers,
      credentials: 'include', // Add this to include cookies
    }, {
      shouldRetry: async (error) => {
        if (error instanceof Response) {
          const status = error.status;
          // On 401, try to refresh token once
          if (status === 401) {
            try {
              await currentUser.getIdToken(true);
              return true; // Retry after token refresh
            } catch (error) {
              console.error('Token refresh failed:', error);
              return false;
            }
          }
          return status >= 500;
        }
        return true;
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: `HTTP error! status: ${response.status}` }));
      if (response.status === 401 || response.status === 403) {
        throw new AuthenticationError(errorData.error || 'Authentication failed');
      }
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  } catch (error) {
    console.error('Fetch error:', error);
    if (error instanceof AuthenticationError) {
      // Force sign out on auth errors
      await auth.signOut();
      throw error;
    }
    throw error;
  }
} 