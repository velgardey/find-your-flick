import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { fetchWithRetry } from './retryUtils';

export async function fetchWithAuth(url: string, options: RequestInit = {}) {
  // First check if we have a current user
  const currentUser = auth.currentUser;
  if (!currentUser) {
    // Wait for auth state to be ready
    await new Promise<void>((resolve, reject) => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        unsubscribe();
        if (user) {
          resolve();
        } else {
          reject(new Error('Not authenticated'));
        }
      });
    });
  }

  // At this point, we should have a current user
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Not authenticated');
  }

  try {
    // Force token refresh
    const token = await user.getIdToken(true);
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    };

    const response = await fetchWithRetry(url, {
      ...options,
      headers,
    }, {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 5000,
      shouldRetry: (error) => {
        // Don't retry on 401/403 errors
        if (error instanceof Response) {
          const status = error.status;
          return status >= 500 || (status !== 401 && status !== 403);
        }
        return true;
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: `HTTP error! status: ${response.status}` }));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  } catch (error) {
    console.error('Fetch error:', error);
    throw error;
  }
} 