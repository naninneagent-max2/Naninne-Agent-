import { tool } from "ai";
import { z } from "zod";
import { Client } from "@notionhq/client";

// ================================================================
// NOTION TOOLS
// ================================================================

export function createNotionTools(token?: string) {
  const notion = new Client({ auth: token ?? process.env.NOTION_API_TOKEN });

  return {
    createPage: tool({
      description: "Cria uma nova página no Notion dentro de uma página ou banco de dados existente.",
      parameters: z.object({
        parentId: z.string().describe("ID da página pai ou banco de dados pai"),
        title: z.string().describe("Título da página"),
        content: z.string().describe("Conteúdo da página em texto puro ou markdown simplificado"),
      }),
      execute: async ({ parentId, title, content }) => {
        try {
          // Implementação simplificada
          const response = await notion.pages.create({
            parent: { page_id: parentId },
            properties: {
              title: [
                { text: { content: title } }
              ]
            },
            children: [
              {
                object: "block",
                paragraph: {
                  rich_text: [
                    { text: { content } }
                  ]
                }
              }
            ]
          });
          return { id: response.id, url: (response as any).url };
        } catch (error: any) {
          return { error: error.message };
        }
      },
    }),
  };
}
