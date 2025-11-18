import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/notifications/stream - Server-Sent Events for real-time notifications
export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id');

  if (!userId) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Create a readable stream for SSE
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      // Send initial connection message
      const data = `data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`;
      controller.enqueue(encoder.encode(data));

      // Track last checked time
      let lastCheck = new Date();

      // Poll for new notifications every 5 seconds
      const interval = setInterval(async () => {
        try {
          // Get new notifications since last check
          const newNotifications = await prisma.notification.findMany({
            where: {
              userId,
              createdAt: {
                gt: lastCheck,
              },
            },
            orderBy: {
              createdAt: 'desc',
            },
          });

          // Send new notifications
          if (newNotifications.length > 0) {
            for (const notification of newNotifications) {
              const eventData = `data: ${JSON.stringify({
                type: 'notification',
                notification,
              })}\n\n`;
              controller.enqueue(encoder.encode(eventData));
            }

            // Update last check time
            lastCheck = new Date();
          }

          // Send heartbeat to keep connection alive
          const heartbeat = `data: ${JSON.stringify({ type: 'heartbeat', timestamp: new Date().toISOString() })}\n\n`;
          controller.enqueue(encoder.encode(heartbeat));
        } catch (error) {
          console.error('SSE error:', error);
          controller.error(error);
        }
      }, 5000); // Check every 5 seconds

      // Cleanup on disconnect
      request.signal.addEventListener('abort', () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
