/**
 * No-op stand-in for the `server-only` package.
 *
 * The real package throws when a module is pulled into a client bundle, which
 * is exactly what we want during `next build`. Command-line scripts (seeding,
 * the scheduled worker, tests) legitimately run the same service modules
 * outside React, so tsconfig.scripts.json maps `server-only` here for them —
 * and only for them. The application build continues to use the real package.
 */
export {};
