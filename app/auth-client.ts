"use client";
import { getApps, initializeApp } from "firebase/app";
import {
  getAuth,
  browserLocalPersistence,
  setPersistence,
  type Auth,
} from "firebase/auth";
let client: Promise<Auth | null> | undefined;
export function getAuthClient() {
  client ??= (async () => {
    const response = await fetch("/api/auth/config", { cache: "no-store" });
    if (!response.ok) throw new Error("Sign-in is temporarily unavailable");
    const { firebase } = (await response.json()) as {
      firebase: {
        apiKey: string;
        authDomain: string;
        projectId: string;
        appId: string;
      } | null;
    };
    if (!firebase) return null;
    const app =
      getApps().find((app) => app.name === "chinese-os") ??
      initializeApp(firebase, "chinese-os");
    const auth = getAuth(app);
    await setPersistence(auth, browserLocalPersistence);
    return auth;
  })().catch((error) => {
    client = undefined;
    throw error;
  });
  return client;
}
export async function authenticatedFetch(
  input: string,
  init: RequestInit,
  ownerId: string,
) {
  const auth = await getAuthClient();
  const headers = new Headers(init.headers);
  const current = auth?.currentUser;
  if (
    current
      ? ownerId !== `firebase:${current.uid}` || !current.emailVerified
      : ownerId.startsWith("firebase:")
  )
    throw new Error("Account changed; retry from the active notebook");
  headers.set("X-Notebook-Owner", ownerId);
  if (current)
    headers.set("Authorization", `Bearer ${await current.getIdToken()}`);
  return fetch(input, { ...init, headers });
}
