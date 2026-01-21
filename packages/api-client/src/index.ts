import { edenTreaty } from '@elysiajs/eden';
import type { App } from '../../../apps/api/src/index';

const API_URL = typeof window !== 'undefined' 
  ? (import.meta as any).env?.VITE_API_URL || 'http://localhost:3500'
  : process.env.VITE_API_URL || 'http://localhost:3500';

export const api = edenTreaty<App>(API_URL);
