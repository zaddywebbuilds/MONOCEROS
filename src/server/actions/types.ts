import type { ZodType } from "zod";

import {
  errorState,
  fieldErrorsFrom,
  idleState,
  successState,
  type ActionState,
} from "@/lib/action-state";
import { isUserFacingError } from "@/lib/errors";

/**
 * Server-side action helpers.
 *
 * The result shape itself lives in lib/action-state.ts so client components can
 * import it without pulling anything server-side into the browser bundle. This
 * module adds the parts only the server needs.
 */

export { errorState, fieldErrorsFrom, idleState, successState };
export type { ActionState };

/** Parses FormData with a Zod schema, returning either data or an error state. */
export function parseForm<S extends ZodType>(
  schema: S,
  formData: FormData,
): { ok: true; data: S["_output"] } | { ok: false; state: ActionState } {
  const raw: Record<string, unknown> = {};

  for (const [key, value] of formData.entries()) {
    // File inputs are read separately by the actions that accept uploads.
    if (value instanceof File) continue;
    raw[key] = value;
  }

  const parsed = schema.safeParse(raw);

  if (!parsed.success) {
    return {
      ok: false,
      state: errorState(
        "Please correct the highlighted fields and try again.",
        fieldErrorsFrom(parsed.error),
      ),
    };
  }

  return { ok: true, data: parsed.data };
}

/**
 * Converts a thrown error into a user-safe action state.
 * Expected domain errors are shown verbatim; anything else is logged on the
 * server and reported generically, so an internal message never leaks.
 */
export function toErrorState(error: unknown): ActionState {
  if (isUserFacingError(error)) {
    return errorState(error.message);
  }

  // eslint-disable-next-line no-console
  console.error("[action] unexpected error:", error);
  return errorState("Something went wrong on our side. Please try again in a moment.");
}

/** Next.js signals redirect() and notFound() by throwing — never swallow those. */
export function isFrameworkError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    ((error as { digest: string }).digest.startsWith("NEXT_REDIRECT") ||
      (error as { digest: string }).digest === "NEXT_NOT_FOUND")
  );
}
