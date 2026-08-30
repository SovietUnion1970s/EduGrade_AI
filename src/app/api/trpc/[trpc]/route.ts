export const dynamic = 'force-dynamic';

import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '../../../../../server/trpc/routers';
import { createContext } from '../../../../../server/trpc/context';

const handler = async (req: Request) => {
  try {
    return await fetchRequestHandler({
      endpoint: '/api/trpc',
      req,
      router: appRouter,
      createContext,
    });
  } catch (error) {
    console.error("TRPC Route Error:", error);
    return new Response(JSON.stringify({ error: { message: (error as any).message } }), { status: 500 });
  }
};

export { handler as GET, handler as POST };
