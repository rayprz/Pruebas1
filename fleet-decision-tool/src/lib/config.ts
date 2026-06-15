// Base URL for client-side API calls. Empty string = same origin (recommended
// when the app and its API are served together). Set NEXT_PUBLIC_API_BASE only
// if the API lives on a different host.
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

/** Build an absolute-or-relative API URL. */
export const api = (path: string) => `${API_BASE}${path}`;
