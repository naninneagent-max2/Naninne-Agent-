import { Client } from "@notionhq/client";

async function main() {
  const token = process.env.NOTION_TOKEN || process.env.NOTION_API_TOKEN;
  if (!token) {
    console.error("NOTION_TOKEN not set");
    process.exit(1);
  }

  const notion = new Client({ auth: token });

  // 1. Verificar autenticação
  console.log("Checking Notion authentication...");
  try {
    const me = await notion.users.me({});
    console.log(`✅ Authenticated as: ${me.name} (${me.type})`);
    console.log(`   Bot ID: ${me.id}`);
  } catch (err: any) {
    console.error(`❌ Authentication failed: ${err.message}`);
    process.exit(1);
  }

  // 2. Buscar páginas/databases acessíveis
  console.log("\nSearching accessible content...");
  try {
    const search = await notion.search({ page_size: 20 });
    console.log(`📄 Accessible items: ${search.results.length}`);

    if (search.results.length === 0) {
      console.log("\n⚠️  Nenhuma página acessível.");
      console.log("   A integração 'Naninne' precisa ser compartilhada com páginas específicas no Notion.");
      console.log("   Instrução para o usuário:");
      console.log("   1. Abra o Notion");
      console.log("   2. Vá em qualquer página ou database");
      console.log("   3. Clique '...' > 'Connections' > Adicione 'Naninne'");
      console.log("   4. Rode este script novamente para confirmar acesso");
    } else {
      search.results.forEach((r: any) => {
        const title = r.properties?.title?.title?.[0]?.plain_text
          || r.properties?.Name?.title?.[0]?.plain_text
          || r.title?.[0]?.plain_text
          || "(untitled)";
        console.log(`   - [${r.object}] ${r.id} — ${title}`);
      });
    }

    // 3. Tentar criar database "Hub de Projetos" se tiver acesso a alguma página
    if (search.results.length > 0) {
      const parentPage = search.results.find((r: any) => r.object === "page");
      if (parentPage) {
        console.log(`\n📦 Tentando criar database 'Naninne — Hub de Projetos' em ${parentPage.id}...`);
        try {
          const db = await notion.databases.create({
            parent: { page_id: parentPage.id },
            title: [{ text: { content: "Naninne — Hub de Projetos" } }],
            properties: {
              Nome: { title: {} },
              Projeto: {
                select: {
                  options: [
                    { name: "RC Agropecuária", color: "green" },
                    { name: "Villa Canabrava", color: "blue" },
                    { name: "Hermes Agent OS", color: "purple" },
                    { name: "Casa de Memória e Futuro", color: "yellow" },
                    { name: "Mundo Roberth", color: "orange" },
                  ],
                },
              },
              Status: {
                select: {
                  options: [
                    { name: "Backlog", color: "default" },
                    { name: "Em Progresso", color: "blue" },
                    { name: "Bloqueado", color: "red" },
                    { name: "Concluído", color: "green" },
                  ],
                },
              },
              Risco: { number: { format: "number" } },
              "Criado em": { created_time: {} },
              Descrição: { rich_text: {} },
            },
          });
          console.log(`✅ Database criada: ${db.id}`);
          console.log(`   URL: ${(db as any).url}`);
          console.log(`   Salvar database_id para uso futuro: ${db.id}`);
        } catch (err: any) {
          console.log(`⚠️  Não foi possível criar database: ${err.message}`);
          console.log("   O usuário pode precisar dar permissão de 'edit' à integração na página pai.");
        }
      }
    }
  } catch (err: any) {
    console.error(`❌ Search failed: ${err.message}`);
  }

  console.log("\n✅ Notion check complete!");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
