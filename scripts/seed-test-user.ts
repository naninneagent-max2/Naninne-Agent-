/**
 * Seed test user with correct password hash.
 * Run: npx tsx scripts/seed-test-user.ts
 * 
 * Password: MundoRoberth2024!
 * Email: test@naninne.dev
 */
import * as bcrypt from "bcryptjs";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function main() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const email = "test@naninne.dev";
  const password = "MundoRoberth2024!";
  const hash = await bcrypt.hash(password, 12);

  // Upsert user
  const res = await fetch(`${SUPABASE_URL}/rest/v1/users?email=eq.${email}`, {
    method: "GET",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  });

  const users = await res.json();

  if (users.length > 0) {
    // Update existing
    const updateRes = await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${users[0].id}`, {
      method: "PATCH",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({ password_hash: hash }),
    });
    const updated = await updateRes.json();
    console.log(`Updated user ${email} (id: ${updated[0]?.id})`);
  } else {
    // Create new
    const createRes = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        email,
        name: "Test User",
        password_hash: hash,
        role: "owner",
        is_active: true,
      }),
    });
    const created = await createRes.json();
    console.log(`Created user ${email} (id: ${created[0]?.id})`);
  }

  console.log(`\nCredentials:\n  Email: ${email}\n  Password: ${password}\n  Hash: ${hash}`);
}

main().catch(console.error);
