import type { APIRoute } from 'astro';
import { getVisits, incrementVisits } from '../../lib/visits';

export const GET: APIRoute = () => {
  return new Response(JSON.stringify({ count: getVisits() }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

export const POST: APIRoute = () => {
  const count = incrementVisits();
  return new Response(JSON.stringify({ count }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
