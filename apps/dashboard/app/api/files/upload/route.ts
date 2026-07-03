import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../../lib/auth";
import { createServiceClient } from "../../../../lib/supabase";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

    const sb = createServiceClient();

    // Upload to Supabase Storage
    const path = `uploads/${Date.now()}_${file.name}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await sb.storage.from("hermes-files").upload(path, buffer, {
      contentType: file.type,
    });

    // Insert file record even if storage upload fails (some Supabase plans don't have storage)
    const { data, error } = await sb
      .from("files")
      .insert({
        filename: file.name,
        mime_type: file.type,
        size_bytes: file.size,
        storage_path: uploadError ? null : path,
        uploaded_by: user.sub,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data);
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
