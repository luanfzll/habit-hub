# HabitHub

Tracker de hábitos em que cada hábito vira uma grade de quadradinhos, um por dia, como o gráfico de contribuições do GitHub. O diferencial é o perfil público e a imagem da grade para colar no README do GitHub, que se atualiza sozinha.

As decisões de produto e de arquitetura, cada uma com a justificativa, estão em [docs/decisoes.md](docs/decisoes.md).

## Estado atual

| Marco                | Conteúdo                                                                                                          | Situação                                                                                                |
| -------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| M0, Fundação         | Next.js, Prisma, Postgres, testes, CI, deploy na Vercel com Neon e Sentry, cadastro fechado em produção           | Pronto, no ar em [habithub-app.vercel.app](https://habithub-app.vercel.app)                             |
| M1, Versão mínima    | Cadastro e login, fuso no perfil, criar e editar hábito, registrar dias, grade                                    | Pronto                                                                                                  |
| M2, Regras completas | Pular dia com motivo, arquivar e excluir, página do hábito com estatísticas, visual novo, painel "Hoje" e tarefas | Pronto                                                                                                  |
| M3, Perfil público   | Hábitos públicos (até 2), nome de usuário, `/u/<nome>`, imagem SVG para o README                                  | Pronto                                                                                                  |
| M4, Contas           | Recuperar senha, confirmar e trocar e-mail, trocar senha, exportar os dados, excluir a conta                      | Pronto. O login pelo GitHub saiu do escopo (veja as decisões)                                           |
| M5, Lançamento       | Página inicial, sugestões no painel vazio, página de privacidade, README final, cadastro aberto                   | Em andamento: página inicial, privacidade e sugestões prontas. Faltam abrir o cadastro e o README final |

## Stack

Next.js 16 (App Router, Cache Components) · React 19 · TypeScript · Postgres 17 · Prisma 7 · Better Auth · next-intl (pt-BR) · Tailwind CSS 4 + shadcn/ui (Base UI) · Vitest · Playwright

## Rodando localmente

Requisitos: Node 24 (veja `.nvmrc`) e Docker.

```bash
cp .env.example .env          # depois gere o segredo: openssl rand -base64 32
docker compose up -d          # Postgres 17 na porta 5434
npm install
npm run db:migrate            # aplica as migrações no banco local
npm run db:seed               # opcional: conta de exemplo com meses de histórico
npm run dev                   # http://localhost:3100
```

A conta de exemplo criada pelo seed é `dev@habithub.local`, com a senha `senha-de-dev-123`.

Em desenvolvimento, os e-mails não são enviados: o texto e os links aparecem no terminal e ficam salvos em `.outbox/` (`EMAIL_TRANSPORT=console`).

## Deploy

O app roda na Vercel (funções em São Paulo), com o banco no Neon e os erros no Sentry. Cada merge na `main` publica sozinho: antes do build, um script cria uma cópia de backup do banco e aplica as migrações. O passo a passo e as variáveis de ambiente estão em [docs/deploy.md](docs/deploy.md).

## Testes

| Comando                                                       | O que roda                                                                                               |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `npm run test:unit`                                           | Regras de domínio (datas, estados do dia, sequências, grade), executadas nos fusos de São Paulo e Tóquio |
| `npm run test:integration`                                    | Serviços contra um Postgres de verdade (banco `habithub_test`), também em dois fusos                     |
| `npm run test:e2e`                                            | Fluxos completos no navegador (desktop e celular) com verificação de acessibilidade (axe)                |
| `npm run lint` · `npm run typecheck` · `npm run format:check` | Qualidade estática                                                                                       |

A CI (`.github/workflows/ci.yml`) roda tudo isso em cada pull request.

## Organização

```
src/
  domain/          regras puras em TypeScript, sem Next nem banco (datas, estados do dia, sequências, grade)
  server/          acesso ao banco, autenticação, serviços e Server Actions
  components/      componentes de interface (habit/ = grade, cartão, menu do dia, formulário)
  app/             rotas: (auth) entrar e cadastro, (app) painel, hábitos e configurações
  i18n/, messages/ textos da interface (só pt-BR por enquanto)
prisma/            esquema, migrações (com as restrições CHECK do domínio) e seed local
e2e/               testes Playwright
```

Algumas escolhas que valem conhecer antes de mexer no código:

- **Um dia é sempre um `CalendarDate` (`"2026-10-13"`)**, nunca um `Date`. A conversão para o formato do Prisma acontece só em `src/server/db-dates.ts`.
- **"Hoje" vem do fuso salvo no perfil** (`userToday`), nunca do navegador.
- **Meta e agenda têm versões** (`habit_config_versions`). Uma mudança vale a partir de hoje e não reescreve o passado.
- **A mesma função (`buildGrid`) calcula a grade** para o app e, no futuro, para a imagem SVG do README.
