import { sleep } from './utils';

interface RetryConfig {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  shouldRetry?: (error: unknown) => boolean;
}

const defaultConfig: Required<RetryConfig> = {
  maxRetries: 3,
  baseDelay: 1000, // Start with 1 second delay
  maxDelay: 10000, // Max delay of 10 seconds
  shouldRetry: (error: unknown) => {
    // Retry on network errors and 5xx server errors
    if (error instanceof Error) {
      return error.name === 'TypeError' || error.name === 'NetworkError';
    }
    if (error instanceof Response) {
      return error.status >= 500 && error.status < 600;
    }
    return false;
  },
};

export async function fetchWithRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
  retryConfig: RetryConfig = {}
): Promise<Response> {
  const config = { ...defaultConfig, ...retryConfig };
  
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      const response = await fetch(input, init);
      
      // If response is not ok and it's a server error (5xx), throw it to trigger retry
      if (!response.ok && response.status >= 500 && response.status < 600) {
        throw response;
      }
      
      return response;
    } catch (error) {
      if (attempt === config.maxRetries || !config.shouldRetry(error)) {
        throw error;
      }
      
      // Calculate exponential backoff delay
      const delay = Math.min(
        config.baseDelay * Math.pow(2, attempt),
        config.maxDelay
      );
      
      await sleep(delay);
    }
  }
  
  throw new Error('Max retries exceeded');
} 