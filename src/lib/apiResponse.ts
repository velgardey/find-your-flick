import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

export type ApiResponse<T> = {
  data: T;
  error?: string;
  details?: unknown;
};

export function successResponse<T>(data: T): NextResponse {
  // Ensure we're not double-wrapping the data
  const responseData = (data && typeof data === 'object' && 'data' in data) 
    ? data 
    : { data };
  
  console.log('Sending API response:', responseData);
  return NextResponse.json(responseData);
}

export function errorResponse(
  message: string,
  status: number = 500,
  details?: unknown
): NextResponse {
  const response: ApiResponse<never> = { 
    data: null as never,  // Always include a data field
    error: message 
  };
  if (details) {
    response.details = details;
  }
  return NextResponse.json(response, { status });
}

export function handleApiError(error: unknown): NextResponse {
  console.error('API Error:', error);

  if (error instanceof ZodError) {
    return errorResponse('Invalid input data', 400, error.errors);
  }

  const message = error instanceof Error ? error.message : 'Unknown error occurred';
  return errorResponse(message);
}

export function notFoundResponse(resource: string): NextResponse {
  return errorResponse(`${resource} not found`, 404);
}

export function unauthorizedResponse(): NextResponse {
  return errorResponse('Unauthorized', 401);
}

export function badRequestResponse(message: string): NextResponse {
  return errorResponse(message, 400);
} 