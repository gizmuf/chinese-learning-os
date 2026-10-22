// The demo must never contact an account service, even if called by mistake.
export async function authenticatedFetch(): Promise<Response> {
  throw new Error("Cloud sync is disabled in the teacher demo.");
}
