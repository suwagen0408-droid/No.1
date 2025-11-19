/**
 * API Helper Functions
 * Common utilities for API route handlers
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Get authenticated user from request headers
 * @param request - Next.js request object
 * @returns User object with manufacturer/facility relations, or null if not found
 */
export async function getAuthenticatedUser(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  
  if (!userId) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      manufacturer: true,
      facility: true,
    },
  });

  return user;
}

/**
 * Create an unauthorized response
 */
export function unauthorizedResponse(message: string = 'Unauthorized') {
  return NextResponse.json(
    { error: message },
    { status: 401 }
  );
}

/**
 * Create a forbidden response
 */
export function forbiddenResponse(message: string = 'Forbidden') {
  return NextResponse.json(
    { error: message },
    { status: 403 }
  );
}

/**
 * Create a not found response
 */
export function notFoundResponse(message: string = 'Not found') {
  return NextResponse.json(
    { error: message },
    { status: 404 }
  );
}

/**
 * Create a bad request response
 */
export function badRequestResponse(message: string = 'Bad request', details?: any) {
  return NextResponse.json(
    { error: message, ...(details && { details }) },
    { status: 400 }
  );
}

/**
 * Create an internal server error response
 */
export function serverErrorResponse(message: string = 'Internal server error') {
  return NextResponse.json(
    { error: message },
    { status: 500 }
  );
}

/**
 * Create a success response
 */
export function successResponse(data: any, message?: string) {
  return NextResponse.json({
    ...(message && { message }),
    ...data,
  });
}

/**
 * Check if user has required role
 */
export function hasRole(
  user: any,
  roles: ('manufacturer' | 'facility' | 'admin')[]
): boolean {
  return roles.includes(user.role);
}

/**
 * Verify user is a manufacturer and get manufacturer profile
 */
export async function verifyManufacturer(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { manufacturer: true },
  });

  if (!user || user.role !== 'manufacturer' || !user.manufacturer) {
    return null;
  }

  return user.manufacturer;
}

/**
 * Verify user is a facility and get facility profile
 */
export async function verifyFacility(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { facility: true },
  });

  if (!user || user.role !== 'facility' || !user.facility) {
    return null;
  }

  return user.facility;
}

/**
 * Verify user is an admin
 */
export async function verifyAdmin(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user || user.role !== 'admin') {
    return null;
  }

  return user;
}

/**
 * Parse query parameters with type safety
 */
export function getQueryParams(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  return {
    get: (key: string) => searchParams.get(key),
    getNumber: (key: string, defaultValue?: number) => {
      const value = searchParams.get(key);
      if (!value) return defaultValue;
      const parsed = parseInt(value, 10);
      return isNaN(parsed) ? defaultValue : parsed;
    },
    getBoolean: (key: string, defaultValue?: boolean) => {
      const value = searchParams.get(key);
      if (value === null) return defaultValue;
      return value === 'true';
    },
    getArray: (key: string) => {
      const value = searchParams.get(key);
      if (!value) return [];
      return value.split(',').map(v => v.trim()).filter(Boolean);
    },
  };
}

/**
 * Standard error handler for API routes
 */
export function handleApiError(error: any) {
  console.error('API Error:', error);

  if (error.name === 'ZodError') {
    return badRequestResponse('Validation error', error.issues);
  }

  if (error.code === 'P2002') {
    return badRequestResponse('Duplicate entry');
  }

  if (error.code === 'P2025') {
    return notFoundResponse('Record not found');
  }

  return serverErrorResponse('An unexpected error occurred');
}
