import { NextResponse, type NextRequest } from "next/server";
import { sbSelect } from "../../../../lib/supabase";
import { verifyPassword, createToken, COOKIE_NAME } from "../../../../lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email e senha são obrigatórios" }, { status: 400 });
    }

    const users = await sbSelect("users", {
      email: `eq.${email.toLowerCase().trim()}`,
      select: "id,name,email,role,password_hash,is_active",
    });

    if (!users || users.length === 0) {
      return NextResponse.json({ error: "Credenciais inválidas" }, { status: 401 });
    }

    const user = users[0];

    if (!user.password_hash) {
      return NextResponse.json({ error: "Credenciais inválidas" }, { status: 401 });
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      return NextResponse.json({ error: "Credenciais inválidas" }, { status: 401 });
    }

    const token = await createToken(user.id, user.email);

    const response = NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      access_token: token,
    });

    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 86400,
      path: "/",
    });

    return response;
  } catch (err: any) {
    console.error("SIGNIN ERROR:", err.message);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
