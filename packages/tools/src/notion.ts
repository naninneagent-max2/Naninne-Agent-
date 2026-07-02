import { tool } from "ai";
import { z } from "zod";
import { Client } from "@notionhq/client";

// ================================================================
// NOTION TOOLS — CRUD + Search + Query
// ================================================================

export function createNotionTools(token?: string) {
  const notion = new Client({ auth: token ?? process.env.NOTION_TOKEN ?? process.env.NOTION_API_TOKEN });

  return {
    createPage: tool({
      description: "Cria uma nova página no Notion. Pode ser filha de uma página ou de um database.",
      parameters: z.object({
        parentId: z.string().describe("ID da página pai ou database pai"),
        parentType: z.enum(["page", "database"]).default("page").describe("Tipo do parent"),
        title: z.string().describe("Título da página"),
        content: z.string().optional().describe("Conteúdo em texto"),
        properties: z.record(z.any()).optional().describe("Propriedades adicionais (para databases)"),
      }),
      execute: async ({ parentId, parentType, title, content, properties }) => {
        try {
          const parent =
            parentType === "database"
              ? { database_id: parentId }
              : { page_id: parentId };

          const titleProp =
            parentType === "database"
              ? { Nome: { title: [{ text: { content: title } }] }, ...(properties || {}) }
              : { title: [{ text: { content: title } }] };

          const children = content
            ? [{ object: "block" as const, paragraph: { rich_text: [{ text: { content } }] } }]
            : [];

          const response = await notion.pages.create({
            parent: parent as any,
            properties: titleProp as any,
            children: children as any,
          });
          return { id: response.id, url: (response as any).url };
        } catch (error: any) {
          return { error: error.message };
        }
      },
    }),

    updatePage: tool({
      description: "Atualiza propriedades de uma página existente no Notion.",
      parameters: z.object({
        pageId: z.string().describe("ID da página a atualizar"),
        properties: z.record(z.any()).describe("Propriedades a atualizar (formato Notion API)"),
      }),
      execute: async ({ pageId, properties }) => {
        try {
          const response = await notion.pages.update({
            page_id: pageId,
            properties: properties as any,
          });
          return { id: response.id, url: (response as any).url, updated: true };
        } catch (error: any) {
          if (error.code === "object_not_found") {
            return { error: `Página ${pageId} não encontrada. A integração Naninne pode não ter acesso.` };
          }
          return { error: error.message };
        }
      },
    }),

    searchPages: tool({
      description: "Busca páginas e databases no Notion pelo título ou conteúdo.",
      parameters: z.object({
        query: z.string().describe("Texto para buscar"),
        filter: z.enum(["page", "database"]).optional().describe("Filtrar por tipo"),
        pageSize: z.number().default(10).describe("Máximo de resultados"),
      }),
      execute: async ({ query, filter, pageSize }) => {
        try {
          const searchParams: any = { query, page_size: pageSize };
          if (filter) {
            searchParams.filter = { value: filter, property: "object" };
          }
          const response = await notion.search(searchParams);
          return {
            count: response.results.length,
            results: response.results.map((r: any) => ({
              id: r.id,
              type: r.object,
              title:
                r.properties?.title?.title?.[0]?.plain_text ||
                r.properties?.Nome?.title?.[0]?.plain_text ||
                r.title?.[0]?.plain_text ||
                "(untitled)",
              url: r.url,
              lastEdited: r.last_edited_time,
            })),
          };
        } catch (error: any) {
          return { error: error.message };
        }
      },
    }),

    queryDatabase: tool({
      description: "Consulta um database do Notion com filtros e ordenação.",
      parameters: z.object({
        databaseId: z.string().describe("ID do database Notion"),
        filter: z.any().optional().describe("Filtro Notion API (ex: {property:'Status', select:{equals:'Em Progresso'}})"),
        sorts: z.array(z.any()).optional().describe("Ordenação Notion API"),
        pageSize: z.number().default(20).describe("Máximo de resultados"),
      }),
      execute: async ({ databaseId, filter, sorts, pageSize }) => {
        try {
          const params: any = { database_id: databaseId, page_size: pageSize };
          if (filter) params.filter = filter;
          if (sorts) params.sorts = sorts;

          const response = await notion.databases.query(params);
          return {
            count: response.results.length,
            hasMore: response.has_more,
            results: response.results.map((page: any) => {
              const props: any = {};
              for (const [key, val] of Object.entries(page.properties || {})) {
                const v = val as any;
                if (v.title) props[key] = v.title[0]?.plain_text || "";
                else if (v.select) props[key] = v.select?.name || "";
                else if (v.number !== undefined) props[key] = v.number;
                else if (v.rich_text) props[key] = v.rich_text[0]?.plain_text || "";
                else if (v.created_time) props[key] = v.created_time;
                else props[key] = JSON.stringify(v).slice(0, 100);
              }
              return { id: page.id, url: page.url, properties: props };
            }),
          };
        } catch (error: any) {
          if (error.code === "object_not_found") {
            return { error: `Database ${databaseId} não encontrado. A integração Naninne pode não ter acesso.` };
          }
          return { error: error.message };
        }
      },
    }),
  };
}
