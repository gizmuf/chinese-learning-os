import {
  decodeProtectedHeader,
  importX509,
  jwtVerify,
  type JWTVerifyGetKey,
} from "jose";
const CERTIFICATES =
  "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";
let cache:
  { certificates: Record<string, string>; expiresAt: number } | undefined;
let loading: Promise<void> | undefined;
const publicKey: JWTVerifyGetKey = async (header) => {
  if (header.alg !== "RS256" || !header.kid)
    throw new Error("Unsupported identity token");
  if (!cache || cache.expiresAt <= Date.now()) {
    loading ??= (async () => {
      const response = await fetch(CERTIFICATES, {
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) throw new Error("Identity keys unavailable");
      const value = (await response.json()) as Record<string, string>;
      const maxAge = Number(
        response.headers.get("cache-control")?.match(/max-age=(\d+)/)?.[1] ??
          300,
      );
      cache = {
        certificates: value,
        expiresAt: Date.now() + Math.min(maxAge, 86400) * 1000,
      };
    })().finally(() => {
      loading = undefined;
    });
    await loading;
  }
  const certificate = cache?.certificates[header.kid];
  if (typeof certificate !== "string") throw new Error("Unknown identity key");
  return importX509(certificate, "RS256");
};
export async function verifyFirebaseToken(
  token: string,
  projectId: string,
  getKey: JWTVerifyGetKey = publicKey,
) {
  if (!projectId || token.length > 20000)
    throw new Error("Invalid identity token");
  const header = decodeProtectedHeader(token);
  if (header.alg !== "RS256" || !header.kid)
    throw new Error("Invalid identity algorithm");
  const { payload } = await jwtVerify(token, getKey, {
    algorithms: ["RS256"],
    audience: projectId,
    issuer: `https://securetoken.google.com/${projectId}`,
    requiredClaims: ["exp", "iat", "auth_time", "sub"],
  });
  const now = Math.floor(Date.now() / 1000);
  if (
    !payload.sub ||
    payload.sub.length > 128 ||
    typeof payload.iat !== "number" ||
    payload.iat > now ||
    typeof payload.auth_time !== "number" ||
    payload.auth_time > now
  )
    throw new Error("Invalid identity claims");
  if (typeof payload.email !== "string" || payload.email_verified !== true)
    throw new Error("Verify your email before syncing progress");
  const name =
    typeof payload.name === "string" && payload.name.trim()
      ? payload.name
      : payload.email.split("@")[0];
  return {
    userId: `firebase:${payload.sub}`,
    displayName: name,
    fullName: name,
    email: payload.email,
  };
}
