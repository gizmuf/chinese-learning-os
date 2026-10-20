import { env } from "cloudflare:workers";
export type FirebaseWebConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
};
export function getFirebaseConfig(): FirebaseWebConfig | null {
  try {
    if (!env.FIREBASE_WEB_CONFIG) return null;
    const config = JSON.parse(env.FIREBASE_WEB_CONFIG);
    if (
      !["apiKey", "authDomain", "projectId", "appId"].every(
        (key) => typeof config[key] === "string" && config[key],
      )
    )
      return null;
    return {
      apiKey: config.apiKey,
      authDomain: config.authDomain,
      projectId: config.projectId,
      appId: config.appId,
    };
  } catch {
    return null;
  }
}
