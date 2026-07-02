import { tool } from "ai";
import { z } from "zod";
import { Octokit } from "@octokit/rest";

// ================================================================
// GITHUB TOOLS
// ================================================================

export function createGitHubTools(token?: string) {
  const octokit = new Octokit({ auth: token ?? process.env.GITHUB_TOKEN });

  return {
    readRepository: tool({
      description: "Lê informações e metadados de um repositório do GitHub.",
      parameters: z.object({
        owner: z.string().describe("Dono do repositório"),
        repo: z.string().describe("Nome do repositório"),
      }),
      execute: async ({ owner, repo }) => {
        try {
          const { data } = await octokit.rest.repos.get({ owner, repo });
          return {
            name: data.name,
            description: data.description,
            stars: data.stargazers_count,
            forks: data.forks_count,
            open_issues: data.open_issues_count,
            default_branch: data.default_branch,
            url: data.html_url,
          };
        } catch (error: any) {
          return { error: error.message };
        }
      },
    }),
    
    // Ferramentas de escrita / PR requerem nível de risco mais alto no Agente Maestro
    createIssue: tool({
      description: "Cria uma nova issue no repositório.",
      parameters: z.object({
        owner: z.string(),
        repo: z.string(),
        title: z.string(),
        body: z.string(),
      }),
      execute: async ({ owner, repo, title, body }) => {
        try {
          const { data } = await octokit.rest.issues.create({
            owner,
            repo,
            title,
            body,
          });
          return { url: data.html_url, number: data.number };
        } catch (error: any) {
          return { error: error.message };
        }
      },
    }),
  };
}
