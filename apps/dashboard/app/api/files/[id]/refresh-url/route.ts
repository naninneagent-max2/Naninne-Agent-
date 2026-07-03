import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../../../lib/auth";
import { refreshSignedUrl } from "../../../../../lib/files/upload-service";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const result = await refreshSignedUrl(id);
  if (!result) return NextResponse.json({ error: "File not found or URL generation failed" }, { status: 404 });

  return NextResponse.json(result);
}
