import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../../lib/auth";
import { createServiceClient } from "../../../../lib/supabase";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { current_password, new_password } = await req.json();
  if (!current_password || !new_password) {
    return NextResponse.json({ error: "Missing passwords" }, { status: 400 });
  }

  if (new_password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const sb = createServiceClient();
  const { data: userData } = await sb
    .from("users")
    .select("password_hash")
    .eq("id", user.sub)
    .single();

  if (!userData) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const valid = await bcrypt.compare(current_password, userData.password_hash);
  if (!valid) return NextResponse.json({ error: "Senha atual incorreta" }, { status: 400 });

  const hash = await bcrypt.hash(new_password, 12);
  await sb.from("users").update({ password_hash: hash }).eq("id", user.sub);

  return NextResponse.json({ ok: true });
}
