import { NextRequest } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export const runtime = "nodejs";

/**
 * Dev-only error telemetry: client-side exceptions (incl. scene crashes) are
 * POSTed here so they can be inspected from the server log.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const file = path.join(process.cwd(), "client-errors.log");
    await fs.appendFile(file, `${new Date().toISOString()} ${body}\n`, "utf8");
  } catch {
    /* logging must never fail the request */
  }
  return new Response(null, { status: 204 });
}
