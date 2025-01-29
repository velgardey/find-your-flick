interface RetryOptions<E = Error | Response> {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  shouldRetry: (error: E) => boolean | Promise<boolean>;
}

interface ErrorWithResponse extends Error {
  response?: {
    status: number;
  };
}

const defaultRetryOptions: RetryOptions = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 5000,
  shouldRetry: (error: Error | Response) => {
    // Retry on network errors or 5xx server errors
    if (error instanceof Response) {
      return error.status >= 500;
    }
    if ((error as ErrorWithResponse)?.response?.status) {
      return (error as ErrorWithResponse).response!.status >= 500;
    }
    return true; // Retry on network errors
  }
};

export async function withRetry<T, E = Error | Response>(
  operation: () => Promise<T>,
  options: RetryOptions<E> = {} as RetryOptions<E>
): Promise<T> {
  const {
    maxRetries,
    baseDelay,
    maxDelay,
    shouldRetry
  } = { ...defaultRetryOptions, ...options } as Required<RetryOptions<E>>;

  let lastError: E = new Error('Operation failed') as E;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as E;
      
      if (attempt === maxRetries - 1 || !shouldRetry(lastError)) {
        throw error;
      }

      // Calculate exponential backoff delay
      const delay = Math.min(
        baseDelay * Math.pow(2, attempt),
        maxDelay
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
  retryOptions?: Partial<RetryOptions<Error | Response>>
): Promise<Response> {
  const finalRetryOptions: RetryOptions<Error | Response> = {
    ...defaultRetryOptions,
    ...retryOptions
  };

  let lastError: Error | Response;
  let retryCount = 0;

  while (retryCount <= finalRetryOptions.maxRetries) {
    try {
      const response = await fetch(url, options);
      if (!response.ok && await finalRetryOptions.shouldRetry(response)) {
        lastError = response;
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response;
    } catch (error) {
      const shouldRetry = await finalRetryOptions.shouldRetry(error instanceof Error ? error : new Error(String(error)));
      if (retryCount === finalRetryOptions.maxRetries || !shouldRetry) {
        throw error;
      }
      
      const delay = Math.min(
        finalRetryOptions.baseDelay * Math.pow(2, retryCount),
        finalRetryOptions.maxDelay
      );
      
      await new Promise(resolve => setTimeout(resolve, delay));
      retryCount++;
    }
  }

  throw lastError!;
} 