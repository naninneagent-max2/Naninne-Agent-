import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../../lib/auth";
import { createServiceClient } from "../../../../lib/supabase";

export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });

  const sb = createServiceClient();
  await sb.from("users").update({ name }).eq("id", user.sub);
  return NextResponse.json({ ok: true });
}
