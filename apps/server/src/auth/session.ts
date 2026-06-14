import type { FastifyRequest } from 'fastify';
import { store, type AuthSession } from '../services/inMemoryStore.js';

function getHeaderValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export function getBearerToken(request: FastifyRequest): string | undefined {
  const auth = getHeaderValue(request.headers.authorization);
  if (auth?.startsWith('Bearer ')) return auth.slice('Bearer '.length).trim();
  return getHeaderValue(request.headers['x-chronofrost-session']);
}

export function getAuthSession(request: FastifyRequest): AuthSession | null {
  const token = getBearerToken(request);
  return store.getSession(token) ?? null;
}
