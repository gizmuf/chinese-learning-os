import { getRequestUser } from "../../request-user";
import { getDb } from "../../../db";
import { learningEvents } from "../../../db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { eventSchema } from "../../event-schema";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };
export async function GET() {
  const u = await getRequestUser();
  if (!u)
    return Response.json(
      { error: "Please sign in." },
      { status: 401, headers },
    );
  const db = getDb();
  const rows = await db
    .select({ payload: learningEvents.payload })
    .from(learningEvents)
    .where(eq(learningEvents.userId, u.userId));
  return Response.json(
    { events: rows.map((r) => JSON.parse(r.payload)) },
    { headers },
  );
}
export async function POST(request: Request) {
  const u = await getRequestUser();
  if (!u)
    return Response.json(
      { error: "Please sign in." },
      { status: 401, headers },
    );
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return Response.json(
      { error: "Invalid origin." },
      { status: 403, headers },
    );
  if (Number(request.headers.get("content-length") ?? 0) > 1000000)
    return Response.json(
      { error: "Upload too large." },
      { status: 413, headers },
    );
  let body: string;
  try {
    body = await request.text();
    if (body.length > 1000000) throw Error();
  } catch {
    return Response.json(
      { error: "Upload too large." },
      { status: 413, headers },
    );
  }
  let parsed;
  try {
    parsed = z
      .object({ events: z.array(eventSchema).max(20) })
      .safeParse(JSON.parse(body));
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400, headers });
  }
  if (
    !parsed.success ||
    parsed.data.events.some((e) => e.at > Date.now() + 300000)
  )
    return Response.json(
      { error: "Invalid learning event." },
      { status: 400, headers },
    );
  const db = getDb();
  if (parsed.data.events.length)
    await db
      .insert(learningEvents)
      .values(
        parsed.data.events.map((e) => ({
          userId: u.userId,
          id: e.id,
          itemId: e.itemId,
          at: e.at,
          payload: JSON.stringify(e),
        })),
      )
      .onConflictDoNothing();
  return Response.json(
    { accepted: parsed.data.events.map((e) => e.id) },
    { headers },
  );
}
