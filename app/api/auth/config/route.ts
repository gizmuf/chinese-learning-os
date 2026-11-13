import { getFirebaseConfig } from "../../../firebase-config";
export const dynamic = "force-dynamic";
export function GET() {
  // Firebase web configuration identifies the public client; it is not an admin credential.
  return Response.json(
    { firebase: getFirebaseConfig() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
