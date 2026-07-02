import { createClient } from "@supabase/supabase-js";
import { WebSocket } from "ws";

// Polyfill para Node.js < 22
(globalThis as any).WebSocket = WebSocket;

// ================================================================
// Sanity Check — Conexão com Supabase
// ================================================================

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error("❌ SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não definidas!");
    process.exit(1);
  }

  console.log(`🔗 Conectando a: ${url}`);

  const supabase = createClient(url, key, {
    auth: { persistSession: false },
  });

  // 1. Testar conexão básica — contar projetos
  const { data: projects, error: projectsError, count } = await supabase
    .from("projects")
    .select("*", { count: "exact" });

  if (projectsError) {
    console.error("❌ Erro ao consultar projects:", projectsError.message);
    process.exit(1);
  }

  console.log(`✅ Tabela 'projects' acessível — ${count} registros encontrados`);

  if (projects && projects.length > 0) {
    console.log("\n📁 Projetos encontrados:");
    for (const p of projects) {
      console.log(`   • ${p.name} (${p.slug}) — tipo: ${p.type}`);
    }
  }

  // 2. Testar contagem de agentes
  const { count: agentCount, error: agentError } = await supabase
    .from("agents")
    .select("*", { count: "exact", head: true });

  if (agentError) {
    console.error("❌ Erro ao consultar agents:", agentError.message);
  } else {
    console.log(`✅ Tabela 'agents' acessível — ${agentCount} agentes registrados`);
  }

  // 3. Verificar se todas as tabelas principais existem
  const tables = [
    "users", "projects", "agents", "conversations", "messages",
    "memories", "memory_chunks", "memory_embeddings",
    "files", "file_chunks", "tasks", "jobs", "job_events",
    "tool_registry", "tool_calls", "approvals",
    "notion_pages", "github_repos", "github_issues",
    "github_pull_requests", "vercel_deployments",
    "audit_logs", "agent_settings",
  ];

  console.log("\n🗄️ Verificando tabelas...");
  let allOk = true;
  for (const table of tables) {
    const { error } = await supabase.from(table).select("*", { count: "exact", head: true });
    if (error) {
      console.log(`   ❌ ${table}: ${error.message}`);
      allOk = false;
    } else {
      console.log(`   ✅ ${table}`);
    }
  }

  if (allOk) {
    console.log(`\n🎉 Todas as ${tables.length} tabelas verificadas com sucesso!`);
  } else {
    console.log("\n⚠️ Algumas tabelas apresentaram erros.");
  }

  console.log("\n✅ Sanity check completo!");
}

main().catch((err) => {
  console.error("❌ Erro fatal:", err);
  process.exit(1);
});
