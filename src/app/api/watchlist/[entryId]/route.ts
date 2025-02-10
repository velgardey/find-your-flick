import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/authMiddleware';
import { 
  successResponse, 
  handleApiError, 
  notFoundResponse 
} from '@/lib/apiResponse';
import { watchlistUpdateSchema } from '@/lib/validationSchemas';

type Props = {
  params: Promise<{
    entryId: string
  }>
}

export async function GET(
  request: Request,
  props: Props
): Promise<NextResponse> {
  try {
    const params = await props.params;
    const auth = await authenticateRequest(request);
    if (!auth.success) return auth.response;

    const entry = await prisma.watchlistEntry.findFirst({
      where: {
        id: params.entryId,
        userId: auth.user.uid,
      },
    });

    if (!entry) {
      return notFoundResponse('Watchlist entry');
    }

    return successResponse(entry);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: Request,
  props: Props
): Promise<NextResponse> {
  try {
    const params = await props.params;
    const auth = await authenticateRequest(request);
    if (!auth.success) return auth.response;
    
    const body = await request.json();
    const validatedData = watchlistUpdateSchema.parse(body);

    // Verify the entry exists and belongs to the user
    const existingEntry = await prisma.watchlistEntry.findFirst({
      where: {
        id: params.entryId,
        userId: auth.user.uid,
      },
    });

    if (!existingEntry) {
      return notFoundResponse('Watchlist entry');
    }

    // Update the watchlist entry
    const updatedEntry = await prisma.watchlistEntry.update({
      where: {
        id: params.entryId,
      },
      data: {
        ...validatedData,
        updatedAt: new Date(),
      },
    });

    return successResponse(updatedEntry);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: Request,
  props: Props
): Promise<NextResponse> {
  try {
    const params = await props.params;
    const auth = await authenticateRequest(request);
    if (!auth.success) return auth.response;

    const entry = await prisma.watchlistEntry.findFirst({
      where: {
        id: params.entryId,
        userId: auth.user.uid,
      },
    });

    if (!entry) {
      return notFoundResponse('Watchlist entry');
    }

    await prisma.watchlistEntry.delete({
      where: {
        id: params.entryId,
      },
    });

    return successResponse({ message: 'Watchlist entry deleted successfully' });
  } catch (error) {
    return handleApiError(error);
  }
}