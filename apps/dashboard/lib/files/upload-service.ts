import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";

// ================================================================
// Unified Upload Service — Biblioteca Naninne
// All upload paths (chat, dashboard, telegram) call this service
// ================================================================

export type UploadInput = {
  buffer: Buffer;
  original_name: string;
  mime_type: string;
  origin: "chat" | "dashboard" | "telegram";
  user_id: string;
  conversation_id?: string;
  message_id?: string;
  project_id?: string;
  tags?: string[];
  category?: string;
};

export type FileRow = {
  id: string;
  name: string;
  original_name: string;
  internal_name: string;
  mime_type: string;
  extension: string;
  size_bytes: number;
  origin: string;
  storage_bucket: string;
  storage_path: string;
  path: string;
  signed_url: string | null;
  signed_url_expires_at: string | null;
  user_id: string;
  project_id: string | null;
  category: string;
  tags: string[];
  processing_status: string;
  conversation_id: string | null;
  message_id: string | null;
  summary: string | null;
  created_at: string;
};

const BUCKET = "arquivos-naninne";
const MAX_SIZE = 100 * 1024 * 1024; // 100MB
const SIGNED_URL_DURATION = 60 * 60 * 24 * 7; // 7 days

const BLOCKED_EXTENSIONS = new Set([
  "exe", "bat", "sh", "cmd", "com", "msi", "scr", "pif", "vbs", "js",
  "wsf", "wsh", "ps1", "psm1",
]);

const MIME_CATEGORIES: Record<string, (mime: string) => boolean> = {
  imagens: (m) => m.startsWith("image/"),
  audios: (m) => m.startsWith("audio/"),
  videos: (m) => m.startsWith("video/"),
  documentos: (m) =>
    m === "application/pdf" ||
    m.startsWith("text/") ||
    m.includes("msword") ||
    m.includes("openxmlformats") ||
    m.includes("vnd.ms-") ||
    m === "application/rtf",
};

function createSb(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

function classifyFile(mimeType: string): string {
  for (const [cat, test] of Object.entries(MIME_CATEGORIES)) {
    if (test(mimeType)) return cat;
  }
  return "outros";
}

function getExtension(filename: string): string {
  const parts = filename.split(".");
  return parts.length > 1 ? parts.pop()!.toLowerCase() : "";
}

function slugify(text: string, maxLen = 40): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLen);
}

function standardizeName(
  originalName: string,
  origin: string,
  userId: string
): string {
  const date = new Date().toISOString().slice(0, 10); // yyyy-mm-dd
  const userShort = userId.slice(0, 4);
  const uuid8 = uuidv4().slice(0, 8);
  const ext = getExtension(originalName);
  const nameWithoutExt = originalName.replace(/\.[^.]+$/, "");
  const sluggedName = slugify(nameWithoutExt, 40);
  return `${date}_${origin}_${userShort}_${uuid8}_${sluggedName}${ext ? "." + ext : ""}`;
}

function composePath(
  origin: string,
  category: string,
  internalName: string,
  projectSlug?: string
): string {
  if (origin === "chat") return `chat/${category}/${internalName}`;
  if (origin === "telegram") return `telegram/${category}/${internalName}`;
  if (origin === "dashboard" && projectSlug) {
    return `projetos/${projectSlug}/${internalName}`;
  }
  return `biblioteca/${category || "outros"}/${internalName}`;
}

export async function uploadFile(input: UploadInput): Promise<FileRow> {
  const sb = createSb();

  // 1. Validation
  if (input.buffer.length > MAX_SIZE) {
    throw new Error(`Arquivo excede limite de 100MB (${(input.buffer.length / 1024 / 1024).toFixed(1)}MB)`);
  }

  const ext = getExtension(input.original_name);
  if (BLOCKED_EXTENSIONS.has(ext)) {
    throw new Error(`Tipo de arquivo bloqueado: .${ext}`);
  }

  // 2. Classification
  const category = input.category || classifyFile(input.mime_type);

  // 3. Name & path
  const internalName = standardizeName(input.original_name, input.origin, input.user_id);

  // Resolve project slug if project_id provided
  let projectSlug: string | undefined;
  if (input.project_id) {
    const { data: proj } = await sb
      .from("projects")
      .select("slug")
      .eq("id", input.project_id)
      .single();
    if (proj) projectSlug = proj.slug;
  }

  const storagePath = composePath(input.origin, category, internalName, projectSlug);

  // 4. Upload to Storage
  const { error: uploadError } = await sb.storage
    .from(BUCKET)
    .upload(storagePath, input.buffer, {
      contentType: input.mime_type,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Erro no upload ao storage: ${uploadError.message}`);
  }

  // 5. Signed URL (7 days)
  let signedUrl: string | null = null;
  let signedUrlExpiresAt: string | null = null;
  try {
    const { data: signed } = await sb.storage
      .from(BUCKET)
      .createSignedUrl(storagePath, SIGNED_URL_DURATION);
    if (signed?.signedUrl) {
      signedUrl = signed.signedUrl;
      signedUrlExpiresAt = new Date(Date.now() + SIGNED_URL_DURATION * 1000).toISOString();
    }
  } catch {}

  // 6. Insert in files table
  const { data, error } = await sb
    .from("files")
    .insert({
      name: input.original_name,
      original_name: input.original_name,
      internal_name: internalName,
      mime_type: input.mime_type,
      extension: ext,
      size_bytes: input.buffer.length,
      origin: input.origin,
      storage_bucket: BUCKET,
      storage_path: storagePath,
      path: storagePath,
      signed_url: signedUrl,
      signed_url_expires_at: signedUrlExpiresAt,
      user_id: input.user_id,
      project_id: input.project_id || null,
      category,
      tags: input.tags || [],
      processing_status: "pending",
      conversation_id: input.conversation_id || null,
      message_id: input.message_id || null,
      status: "uploaded",
    })
    .select()
    .single();

  if (error || !data) {
    // Cleanup storage on DB error
    await sb.storage.from(BUCKET).remove([storagePath]).catch(() => {});
    throw new Error(`Erro ao salvar registro: ${error?.message || "unknown"}`);
  }

  // 7. Enqueue process_file job
  try {
    await sb.from("jobs").insert({
      type: "process_file",
      input: { file_id: data.id },
      status: "queued",
      priority: 3,
      max_retries: 2,
      scheduled_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[upload-service] Failed to enqueue job:", err);
  }

  return data as FileRow;
}

export async function refreshSignedUrl(
  fileId: string
): Promise<{ signed_url: string; signed_url_expires_at: string } | null> {
  const sb = createSb();
  const { data: file } = await sb
    .from("files")
    .select("id, storage_path, storage_bucket")
    .eq("id", fileId)
    .single();

  if (!file?.storage_path) return null;

  const bucket = file.storage_bucket || BUCKET;
  const { data: signed } = await sb.storage
    .from(bucket)
    .createSignedUrl(file.storage_path, SIGNED_URL_DURATION);

  if (!signed?.signedUrl) return null;

  const expiresAt = new Date(Date.now() + SIGNED_URL_DURATION * 1000).toISOString();

  await sb
    .from("files")
    .update({ signed_url: signed.signedUrl, signed_url_expires_at: expiresAt })
    .eq("id", fileId);

  return { signed_url: signed.signedUrl, signed_url_expires_at: expiresAt };
}
