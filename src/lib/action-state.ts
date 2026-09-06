import type { ZodError } from "zod";

/**
 * Server action result contract.
 *
 * Client components import this module to type `useActionState` and to seed it
 * with `idleState`. It therefore must stay free of any server import — no
 * Prisma, no database driver, no `server-only` — so that a form component
 * never drags the service graph into the browser bundle. The server-side
 * helpers (`parseForm`, `toErrorState`) live in server/actions/types.ts.
 */

export interface ActionState<T = undefined> {
  status: "idle" | "success" | "error";
  message: string | null;
  fieldErrors?: Record<string, string>;
  data?: T;
}

export const idleState: ActionState = { status: "idle", message: null };

export function successState<T>(message: string, data?: T): ActionState<T> {
  return { status: "success", message, data };
}

export function errorState(message: string, fieldErrors?: Record<string, string>): ActionState {
  return { status: "error", message, fieldErrors };
}

/** Flattens a Zod error into a map keyed by input name. */
export function fieldErrorsFrom(error: ZodError): Record<string, string> {
  const result: Record<string, string> = {};

  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    if (!result[key]) result[key] = issue.message;
  }

  return result;
}
