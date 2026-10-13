# HabitHub

Tracker de hábitos em que cada hábito vira uma grade de quadradinhos, um por dia, como o gráfico de contribuições do GitHub. O diferencial planejado é o perfil público e a imagem da grade para colar no README do GitHub.

As decisões de produto e de arquitetura, cada uma com a justificativa, estão em [docs/decisoes.md](docs/decisoes.md).

## Estado atual

| Marco                | Conteúdo                                                                                              | Situação                                                 |
| -------------------- | ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| M0, Fundação         | Next.js, Prisma, Postgres local, testes, CI, cadastro fechado em produção                             | Pronto localmente. Falta conectar Neon, Vercel e Sentry  |
| M1, Versão mínima    | Cadastro e login, fuso no perfil, criar e editar hábito, registrar dias, grade                        | Pronto                                                   |
| M2, Regras completas | Pular dia, arquivar e excluir, página do hábito com estatísticas, tema claro/escuro, grade no celular | Pronto. A revisão de cores fica para a mudança de visual |
| M3 a M5              | Perfil público e imagem do README, contas completas, lançamento                                       | A fazer                                                  |

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

Em desenvolvimento, os e-mails não são enviados: o texto e os links aparecem no terminal (`EMAIL_TRANSPORT=console`).

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
