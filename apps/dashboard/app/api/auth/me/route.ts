import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../../lib/auth";
import { sbSelect } from "../../../../lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  const payload = await getCurrentUser();
  if (!payload) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const users = await sbSelect("users", {
    id: `eq.${payload.sub}`,
    select: "id,name,email,role",
  });

  if (!users || users.length === 0) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ user: users[0] });
}
