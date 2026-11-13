// The isolated Hong Kong learning build has no cloud identity or sync backend.
export async function getAuthClient() { return null; }
export async function authenticatedFetch(): Promise<Response> {
 throw new Error('Account sync is not available on this test server');
}
