# Deploy do HabitHub

Guia para colocar o app no ar na Vercel com o banco no Neon e os erros no Sentry. Segue as decisões da seção 2.10 de [decisoes.md](decisoes.md).

## Como o deploy funciona

- A Vercel roda `npm run vercel-build`, que executa [`scripts/deploy/migrate.ts`](../scripts/deploy/migrate.ts) e depois `next build`.
- **Produção:** o script cria uma cópia do banco no Neon (`backup-<data>`), mantém só as 3 mais recentes e aplica as migrações. Sem as credenciais do Neon, o build falha: a produção nunca é migrada sem backup.
- **Versões de teste dos PRs (preview):** não migram. Elas usam o banco de produção (passo 2.3).
- As funções rodam em São Paulo (`gru1`, definido em [`vercel.json`](../vercel.json)), na mesma região do banco.

## 1. Neon

1. Projeto criado em **AWS São Paulo (`aws-sa-east-1`)**, com Postgres 17.
2. **ID do projeto:** Settings → General → Project ID. Vai em `NEON_PROJECT_ID`.
3. **Chave da API:** Settings → API keys (de preferência uma chave restrita a este projeto). Vai em `NEON_API_KEY`. É secreta.

## 2. Vercel

### 2.1 Importar o projeto

Add New → Project → importe `luanfzll/habit-hub`. Nome do projeto: **`habithub`**. O endereço de produção é **`habithub-app.vercel.app`**, adicionado em Settings → Domains (`habithub.vercel.app` pertence a outra conta). O framework é detectado como Next.js. Não altere os comandos de build.

### 2.2 Variáveis de ambiente

Em Settings → Environment Variables. Os valores secretos nunca vão para o chat nem para o repositório.

| Variável | Ambientes | Valor |
|---|---|---|
| `DATABASE_URL` | Production, Preview | Connection string **pooled** do Neon (Neon → Connect → "Connection pooling" ligado). Preenchida pela integração do passo 2.3, se você usá-la. |
| `DATABASE_URL_UNPOOLED` | Production, Preview | Connection string **direta** (pooling desligado). Usada só pelas migrações. |
| `BETTER_AUTH_SECRET` | Production, Preview | Gere com `openssl rand -base64 32`. Use um valor diferente do `.env` local. |
| `BETTER_AUTH_URL` | **só Production** | `https://habithub-app.vercel.app`. Nas previews, o Better Auth usa o endereço da própria preview. |
| `SIGNUP_ALLOWLIST` | Production, Preview | O seu e-mail. Até o M4, só ele pode criar conta. |
| `EMAIL_TRANSPORT` | Production, Preview | `gmail` (envia de verdade) ou `console` (só escreve nos logs da Vercel) |
| `GMAIL_USER` | Production, Preview | `habithub.mail@gmail.com`, a conta Gmail criada só para o app |
| `GMAIL_APP_PASSWORD` | Production, Preview | A senha de app de 16 letras dessa conta (Conta Google → Segurança → Verificação em duas etapas → Senhas de app), sem espaços. É secreta. |
| `NEXT_PUBLIC_SENTRY_DSN` | Production, Preview | O DSN do Sentry (não é segredo) |
| `SENTRY_ORG` | Production, Preview | `luan-felizola-leal` |
| `SENTRY_PROJECT` | Production, Preview | O identificador do projeto no Sentry (`javascript-nextjs`, se não foi renomeado) |
| `SENTRY_AUTH_TOKEN` | Production, Preview | Token da organização no Sentry (passo 3). É secreto. |
| `NEON_API_KEY` | **só Production** | Passo 1.3 |
| `NEON_PROJECT_ID` | **só Production** | Passo 1.2 |

### 2.3 Previews e banco de dados

As previews usam o mesmo banco da produção (decisão registrada em [decisoes.md](decisoes.md)): `DATABASE_URL` e `DATABASE_URL_UNPOOLED` do ambiente Preview apontam para a branch de produção. Por isso `MIGRATE_PREVIEW_DATABASE` **não** deve ser ligado: uma preview com migração nova a aplicaria na produção sem backup. O que você testar numa preview grava nos seus dados reais.

Para separar no futuro: crie uma branch no Neon (de preferência "schema only"), use as strings dela no ambiente Preview e só então ligue `MIGRATE_PREVIEW_DATABASE=true` no Preview.

## 3. Sentry

1. **Token para os source maps:** Settings → Developer Settings → Organization Tokens → Create New Token. Vai em `SENTRY_AUTH_TOKEN`.
2. **Não guardar IPs:** no projeto, Settings → Security & Privacy → ative **"Prevent Storing of IP Addresses"**. O app já não envia cookies, cabeçalhos (exceto o user-agent), corpos de requisição nem variáveis locais (ver [`src/lib/sentry-options.ts`](../src/lib/sentry-options.ts)).

## 4. Primeiro deploy

1. Faça o deploy (ou o merge de um PR na `main`).
2. No log do build, procure `[deploy] Backup branch created` e a lista de migrações aplicadas.
3. Abra `https://habithub-app.vercel.app/cadastro` e crie a sua conta com o e-mail da `SIGNUP_ALLOWLIST`.
4. Crie seus hábitos e comece a usar todos os dias: é isso que enche a vitrine.

## Se algo der errado

- **O build falhou em "NEON_API_KEY is required":** faltam as variáveis do passo 1 no ambiente Production.
- **Restaurar um backup:** no Neon, abra a branch `backup-…` e use "Reset from parent" ou "Restore" na branch principal. Faça isso antes do próximo deploy, porque cada deploy gira os backups.
- **Erros em produção:** aparecem no Sentry com a linha exata do código.
