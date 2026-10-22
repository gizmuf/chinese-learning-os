import { getRequestUser } from "../../request-user";
import { getDb } from "../../../db";
import { courseEvents } from "../../../db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { courseEventSchema } from "../../course-learning";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };
export async function GET() {
  const user = await getRequestUser();
  if (!user)
    return Response.json(
      { error: "Please sign in." },
      { status: 401, headers },
    );
  const rows = await getDb()
    .select({ payload: courseEvents.payload })
    .from(courseEvents)
    .where(eq(courseEvents.userId, user.userId));
  return Response.json(
    { events: rows.map((r) => JSON.parse(r.payload)) },
    { headers },
  );
}
export async function POST(request: Request) {
  const user = await getRequestUser();
  if (!user)
    return Response.json(
      { error: "Please sign in." },
      { status: 401, headers },
    );
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return Response.json(
      { error: "Invalid origin." },
      { status: 403, headers },
    );
  if (Number(request.headers.get("content-length") ?? 0) > 100000)
    return Response.json(
      { error: "Upload too large." },
      { status: 413, headers },
    );
  let parsed;
  try {
    const body = await request.text();
    if (body.length > 100000)
      return Response.json(
        { error: "Upload too large." },
        { status: 413, headers },
      );
    parsed = z
      .object({ events: z.array(courseEventSchema).max(20) })
      .safeParse(JSON.parse(body));
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400, headers });
  }
  if (
    !parsed.success ||
    parsed.data.events.some((e) => e.at > Date.now() + 300000)
  )
    return Response.json(
      { error: "Invalid course event." },
      { status: 400, headers },
    );
  if (parsed.data.events.length)
    await getDb()
      .insert(courseEvents)
      .values(
        parsed.data.events.map((e) => ({
          userId: user.userId,
          id: e.id,
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
