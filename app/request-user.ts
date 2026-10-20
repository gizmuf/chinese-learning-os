import { headers } from "next/headers";
import { getChatGPTUser } from "./chatgpt-auth";
import { getFirebaseConfig } from "./firebase-config";
import { verifyFirebaseToken } from "./firebase-token";
async function resolveUser() {
  const authorization = (await headers()).get("authorization");
  if (authorization !== null) {
    // Never fall back to another logged-in account when a supplied token is invalid.
    const config = getFirebaseConfig();
    if (!config || !authorization.startsWith("Bearer ")) return null;
    try {
      return await verifyFirebaseToken(
        authorization.slice(7),
        config.projectId,
      );
    } catch {
      return null;
    }
  }
  return getChatGPTUser();
}

export async function getRequestUser() {
  const user = await resolveUser();
  const owner = (await headers()).get("x-notebook-owner");
  return user && (!owner || owner === user.userId) ? user : null;
}
