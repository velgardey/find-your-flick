interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  shouldRetry?: (error: any) => boolean;
}

const defaultRetryOptions: RetryOptions = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 5000,
  shouldRetry: (error: any) => {
    // Retry on network errors or 5xx server errors
    if (error?.response?.status) {
      return error.response.status >= 500;
    }
    return true; // Retry on network errors
  }
};

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries,
    baseDelay,
    maxDelay,
    shouldRetry
  } = { ...defaultRetryOptions, ...options };

  let lastError: any;
  
  for (let attempt = 0; attempt < maxRetries!; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries! - 1 || !shouldRetry!(error)) {
        throw error;
      }

      // Calculate exponential backoff delay
      const delay = Math.min(
        baseDelay! * Math.pow(2, attempt),
        maxDelay!
      );

      // Add some jitter to prevent thundering herd
      const jitter = Math.random() * 200;
      
      await new Promise(resolve => setTimeout(resolve, delay + jitter));
    }
  }

  throw lastError;
}

export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retryOptions: RetryOptions = {}
): Promise<Response> {
  return withRetry(
    () => fetch(url, options),
    {
      ...retryOptions,
      shouldRetry: (error) => {
        if (error instanceof Response) {
          return error.status >= 500;
        }
        return defaultRetryOptions.shouldRetry!(error);
      }
    }
  );
} 