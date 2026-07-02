import { createClient } from "@supabase/supabase-js";

// ================================================================
// WORKER — Processamento Assíncrono do Agent OS
// ================================================================

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  console.log("⚙️ Worker iniciando...");

  // Loop simples de polling (na Fase 5 será substituído por Postgres LISTEN ou PGMQ)
  setInterval(async () => {
    try {
      // Busca jobs pendentes
      const { data: jobs, error } = await supabase
        .from("jobs")
        .select("*")
        .eq("status", "queued")
        .order("priority", { ascending: false })
        .order("created_at", { ascending: true })
        .limit(5);

      if (error) {
        console.error("Erro ao buscar jobs:", error);
        return;
      }

      for (const job of jobs || []) {
        console.log(`Processando job ${job.id} do tipo ${job.type}`);
        
        // Marca como em andamento
        await supabase
          .from("jobs")
          .update({ status: "running", started_at: new Date().toISOString() })
          .eq("id", job.id);

        try {
          // TODO: Executar lógica específica do job com os Agentes Especialistas
          
          await supabase
            .from("jobs")
            .update({ status: "done", completed_at: new Date().toISOString() })
            .eq("id", job.id);
            
        } catch (jobError: any) {
          console.error(`Falha no job ${job.id}:`, jobError);
          await supabase
            .from("jobs")
            .update({ 
              status: "failed", 
              error: jobError.message,
              completed_at: new Date().toISOString() 
            })
            .eq("id", job.id);
        }
      }
    } catch (err) {
      console.error("Erro no loop do worker:", err);
    }
  }, 10000); // Roda a cada 10s
}

main().catch(console.error);
