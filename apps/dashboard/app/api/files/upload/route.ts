import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../../lib/auth";
import { uploadFile } from "../../../../lib/files/upload-service";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    const projectId = formData.get("project_id") as string | null;
    const category = formData.get("category") as string | null;
    const tagsRaw = formData.get("tags") as string | null;
    const tags = tagsRaw ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean) : undefined;

    const buffer = Buffer.from(await file.arrayBuffer());

    const result = await uploadFile({
      buffer,
      original_name: file.name,
      mime_type: file.type || "application/octet-stream",
      origin: "dashboard",
      user_id: user.sub,
      project_id: projectId || undefined,
      tags,
      category: category || undefined,
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("[files/upload] Error:", errMsg);
    return NextResponse.json({ error: errMsg }, { status: 400 });
  }
}
