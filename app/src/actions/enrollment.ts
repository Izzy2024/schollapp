// IMPORTANT: do not export from a `use server` module.
// `enrollment-impl.ts` is a server-actions module and may only export async functions.
// Re-exporting it from a non-`use server` module causes Next/Turbopack to treat it as
// a regular module and fail compilation (exported types/classes in that file).
export * from './enrollment-client';
