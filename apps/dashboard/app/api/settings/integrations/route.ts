import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../../lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const integrations = [
    {
      name: "OpenAI",
      key: "OPENAI_API_KEY",
      connected: !!process.env.OPENAI_API_KEY,
      masked: process.env.OPENAI_API_KEY ? `****${process.env.OPENAI_API_KEY.slice(-4)}` : null,
    },
    {
      name: "Notion",
      key: "NOTION_TOKEN",
      connected: !!(process.env.NOTION_TOKEN || process.env.NOTION_API_TOKEN),
      masked: (process.env.NOTION_TOKEN || process.env.NOTION_API_TOKEN)
        ? `****${(process.env.NOTION_TOKEN || process.env.NOTION_API_TOKEN)!.slice(-4)}`
        : null,
    },
    {
      name: "Telegram",
      key: "TELEGRAM_BOT_TOKEN",
      connected: !!process.env.TELEGRAM_BOT_TOKEN,
      masked: process.env.TELEGRAM_BOT_TOKEN ? `****${process.env.TELEGRAM_BOT_TOKEN.slice(-4)}` : null,
    },
    {
      name: "GitHub",
      key: "GITHUB_TOKEN",
      connected: !!process.env.GITHUB_TOKEN,
      masked: process.env.GITHUB_TOKEN ? `****${process.env.GITHUB_TOKEN.slice(-4)}` : null,
    },
    {
      name: "Supabase",
      key: "SUPABASE_SERVICE_ROLE_KEY",
      connected: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      masked: process.env.SUPABASE_SERVICE_ROLE_KEY ? `****${process.env.SUPABASE_SERVICE_ROLE_KEY.slice(-4)}` : null,
    },
  ];

  return NextResponse.json(integrations);
}
