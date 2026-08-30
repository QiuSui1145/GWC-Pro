/**
 * Centralized API base URL configuration.
 *
 * In dev mode: Vite proxies /api → backend (port 5201), so API_BASE = ''
 * In production: frontend is served by the backend itself, so /api is same-origin
 *
 * This means all fetch calls should use `/api/...` (relative) — no hardcoded host.
 */
export const API_BASE = '';
