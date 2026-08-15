import { NextResponse } from "next/server";
import { createUserAndWorkspace } from "@/lib/auth";
import { rateLimit, getClientIp } from "@/lib/rate-limit";


export async function POST(request: Request) {
  try {
    // Rate limit: 5 signups per 15 minutes per IP
    const ip = getClientIp(request);
    const rl = rateLimit(`signup:${ip}`, { limit: 5, windowMs: 15 * 60 * 1000 });
    if (!rl.success) {
      return NextResponse.json(
        { ok: false, error: "Too many signup attempts. Please try again in a few minutes." },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rl.reset - Date.now()) / 1000)) } },
      );
    }

    const body = await request.json().catch(() => ({}));
    const result = await createUserAndWorkspace(body);
    return NextResponse.json({
      ok: true,
      workspaceId: result.workspace.id,
      userId: result.user.id,
      role: result.user.role,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Signup failed";
    const status = message.includes("already exists") ? 409 : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
