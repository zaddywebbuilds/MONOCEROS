/**
 * Domain error types.
 *
 * Deliberately dependency-free: these are thrown by the service layer and
 * matched by the action layer, and both the client-safe action-state helpers
 * and the server-side services need to name them without dragging Prisma, the
 * database driver or `server-only` into a browser bundle.
 */

/** A rule of the business was broken (wrong stage, duplicate hash, too early). */
export class BusinessRuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BusinessRuleError";
  }
}

/** Authentication failed, or credentials were wrong. */
export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

/** The caller is signed in but is not permitted to do this. */
export class AuthorizationError extends Error {
  constructor(message = "You are not authorised to perform this action.") {
    super(message);
    this.name = "AuthorizationError";
  }
}

/** Too many attempts within the configured window. */
export class RateLimitError extends Error {
  readonly retryAfterSeconds: number;

  constructor(retryAfterSeconds: number) {
    super(`Too many attempts. Please try again in ${Math.ceil(retryAfterSeconds / 60)} minute(s).`);
    this.name = "RateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

/** An investment status change that the state machine does not permit. */
export class InvalidTransitionError extends Error {
  constructor(from: string, to: string) {
    super(`An investment cannot move from ${from} to ${to}.`);
    this.name = "InvalidTransitionError";
  }
}

/** True for any error whose message is safe to show a user verbatim. */
export function isUserFacingError(error: unknown): error is Error {
  return (
    error instanceof BusinessRuleError ||
    error instanceof AuthError ||
    error instanceof AuthorizationError ||
    error instanceof RateLimitError ||
    error instanceof InvalidTransitionError
  );
}
