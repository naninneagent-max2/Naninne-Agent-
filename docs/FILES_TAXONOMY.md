# Biblioteca Naninne — Taxonomia de Arquivos

## Bucket Supabase Storage

- **ID**: `arquivos-naninne`
- **Público**: Não (arquivos servidos via signed URLs)
- **Limite de tamanho**: 100MB por arquivo
- **MIME types**: Todos aceitos (validação na aplicação)

## Estrutura de Pastas (Prefixos)

```
/chat/imagens/
/chat/documentos/
/chat/audios/
/chat/videos/
/chat/outros/
/telegram/imagens/
/telegram/documentos/
/telegram/audios/
/telegram/videos/
/telegram/outros/
/projetos/{project_slug}/
/biblioteca/{categoria}/
/temporarios/
/processados/
```

## Convenção de Nome Interno

```
{yyyy-mm-dd}_{origem}_{user_short:4}_{uuid8}_{slug(original_name):40}.{ext}
```

Exemplo: `2026-07-03_telegram_r0be_a1b2c3d4_orcamento-villa.pdf`

## Classificação Automática por MIME

| Categoria | MIME Types |
|-----------|-----------|
| imagens | `image/*` |
| audios | `audio/*` |
| videos | `video/*` |
| documentos | `application/pdf`, `text/*`, `application/msword`, `application/vnd.openxmlformats-*`, `application/vnd.ms-*`, `application/rtf` |
| outros | fallback |

## Extensões Bloqueadas

`.exe`, `.bat`, `.sh`, `.cmd`, `.com`, `.msi`, `.scr`, `.pif`, `.vbs`, `.js`, `.wsf`, `.wsh`, `.ps1`, `.psm1`

## Colunas da Tabela `files`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid | PK |
| name | text | Nome exibição |
| original_name | text | Nome original do upload |
| internal_name | text (unique) | Nome padronizado no storage |
| mime_type | text | Tipo MIME |
| extension | text | Extensão do arquivo |
| size_bytes | bigint | Tamanho em bytes |
| origin | text | `chat` / `dashboard` / `telegram` |
| storage_bucket | text | Nome do bucket |
| storage_path | text | Path completo no bucket |
| path | text | Path lógico |
| signed_url | text | URL assinada (7 dias) |
| signed_url_expires_at | timestamptz | Expiração da URL |
| user_id | uuid | FK → users |
| project_id | uuid | FK → projects |
| category | text | Classificação automática |
| tags | text[] | Tags (AI + manuais) |
| processing_status | text | `pending` / `processing` / `done` / `failed` |
| summary | text | Resumo gerado por AI |
| conversation_id | uuid | FK → conversations |
| message_id | uuid | FK → messages |
| created_at | timestamptz | Data criação |
| updated_at | timestamptz | Data atualização |

## API Endpoints

| Method | Path | Descrição |
|--------|------|-----------|
| GET | `/api/files` | Listar com filtros + paginação |
| GET | `/api/files?id=xxx` | Detalhe de um arquivo |
| POST | `/api/files/upload` | Upload (multipart/form-data) |
| PATCH | `/api/files` | Editar tags/category/project_id |
| DELETE | `/api/files?id=xxx` | Excluir (storage + DB) |
| POST | `/api/files/{id}/refresh-url` | Gerar nova signed URL |

## Worker Handler: `process_file`

- **Payload**: `{ file_id }`
- **Imagens**: OpenAI Vision gera summary + tags
- **Documentos**: Extrai texto, gera embedding + memory_chunk
- **Áudio/Vídeo**: Skip (futuro: Whisper para transcrição)
- **Max retries**: 2
