# FactorX Proxys

Aplicação full-stack para coletar candidatas de fontes abertas, validar por requisição real, manter um estoque-alvo pequeno e distribuir somente proxies `ACTIVE`.

## Arquitetura

- **Web/API:** Next.js App Router + TypeScript.
- **Worker:** Node/TypeScript separado; executa o cron diário e consome solicitações manuais.
- **Dados:** PostgreSQL + Prisma. A constraint `(protocol, ip, port)` impede duplicatas.
- **Core:** fontes, normalização, checker e motor de manutenção ficam em `src/lib/proxy`.
- **Fontes progressivas:** Relayglass BR, Databay BR, ProxyScrape BR, Proxifly BR, IPLocate BR, FineProxy BR, Stormsia, Monosans, Proxmint, GProxy, HProxy BR, JetKai e PRXCHK. Cada adaptador falha de forma isolada, entra em cooldown após falhas repetidas e a coleta para no limite global de 2.500 candidatas.
- **Brasil verificado:** o país informado pela fonte é preservado separadamente do país confirmado pelo IP de saída. Somente proxies `ACTIVE` com `countryVerified=BR` contam para o alvo brasileiro.
- **Saúde das fontes:** duração, volume coletado, volume BR, aprovações, falhas e cooldown ficam persistidos em `ProxySourceHealth`; atribuições múltiplas ficam em `ProxySourceRecord`.
- **Lock:** advisory lock PostgreSQL impede dois ciclos simultâneos entre instâncias.

O ciclo retesta somente o estoque atual, preserva sobreviventes, coloca falhas em cooldown e busca candidatas em lotes apenas enquanto `ACTIVE < TARGET_PROXY_STOCK`. Ao alcançar o alvo, encerra. O primeiro ciclo com banco vazio funciona como preenchimento inicial.

## Requisitos e instalação

Node.js 20+, PostgreSQL 16+ e npm. Copie `.env.example` para `.env` e preencha `DATABASE_URL`, `PROXY_VALIDATION_URL`, `ADMIN_PASSWORD` e um `SESSION_SECRET` aleatório com pelo menos 32 caracteres.

```bash
npm install
docker compose up -d postgres
npx prisma migrate deploy
npm run dev
```

Web: `http://localhost:3000`. Admin: `http://localhost:3000/admin`.

## Worker, cron e preenchimento inicial

```bash
npm run worker
```

O worker permanece ativo, agenda `PROXY_MAINTENANCE_CRON` na timezone `APP_TIMEZONE` e verifica a fila de manutenção manual a cada 15 segundos. Para executar um único ciclo (inclusive o primeiro preenchimento):

```bash
npm run maintenance
```

Use um endpoint de validação controlado que responda HTTP 2xx/3xx e revele o IP de saída. A URL `httpbin.org/ip` no exemplo é somente um padrão de desenvolvimento e não é recomendada como dependência única de produção. A geolocalização é feita depois do teste real e não transforma falha do serviço geográfico em falso negativo de conectividade.

## APIs

- `GET /api/proxies?country=BR&protocol=SOCKS5&limit=10&quality=GOOD&format=json`
- `GET /api/status`
- `POST /api/admin/login`
- `POST /api/admin/maintenance` (sessão administrativa; apenas enfileira)

`/api/proxies` limita a no máximo 50 no backend, aplica filtros, embaralha no PostgreSQL e consulta exclusivamente `ACTIVE`.

## Testes e validação

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Os testes não usam proxies reais. A arquitetura aceita `MockProxySource` e `MockProxyChecker` pelas interfaces `ProxySource` e `ProxyChecker`.

## Deploy

Hospede o web em Vercel ou qualquer host Node, PostgreSQL em Neon/Supabase/PostgreSQL gerenciado e o worker em Railway, Render, Fly.io ou VPS. Execute `prisma migrate deploy` antes do rollout. O worker precisa de processo persistente; verificações pesadas não rodam em funções serverless.

### Supabase

Use a connection string PostgreSQL fornecida pelo Supabase como `DATABASE_URL`. Prefira o pooler em modo de sessão para o worker. Nunca salve a URL em arquivos versionados. Depois de cadastrar a variável no ambiente:

```bash
npm run db:migrate
npm run db:check
npm run maintenance
```

`db:check` confirma conexão, migrations e contagens sem imprimir credenciais. `db:proxy-report` mostra estoque, latência, país verificado e saúde das fontes sem imprimir secrets.

### Vercel e worker

O `vercel.json` configura somente o site e as APIs leves. Cadastre na Vercel `DATABASE_URL`, `APP_TIMEZONE`, `TARGET_PROXY_STOCK`, `MAX_PROXY_GENERATION`, `API_RATE_LIMIT`, `ADMIN_PASSWORD`, `SESSION_SECRET` e os thresholds de qualidade. Não execute a manutenção na Vercel.

O `Dockerfile.worker` e o `render.yaml` preparam o processo persistente separado. Cadastre nele `DATABASE_URL`, `PROXY_VALIDATION_URL` e as variáveis de manutenção. O worker executa o cron, recupera jobs abandonados após reinício e consome os pedidos manuais do painel. O frontend e as APIs leves podem permanecer na Vercel; os testes massivos não devem rodar em função serverless.

## Segurança e limites conhecidos

- Sessão admin assinada, cookie `httpOnly`, `secure` em produção e `sameSite=strict`.
- Headers de segurança e validação de inputs com Zod.
- O rate limit V1 é por instância e em memória, adequado a implantação única. Em escala horizontal, substitua por armazenamento compartilhado.
- `TRUST_PROXY_HEADERS=false` por padrão. Habilite apenas atrás de proxy reverso conhecido que sobrescreva os headers do cliente.
- Proxies públicas não são garantidas como seguras, privadas, residenciais ou anônimas.
- Fontes públicas mudam, ficam vazias ou bloqueiam requisições. Cada adaptador registra sua própria saúde; uma indisponibilidade não derruba o ciclo nem apaga o estoque sobrevivente.

## Troubleshooting

- `P1001`: confira `DATABASE_URL` e se o PostgreSQL está acessível.
- Estoque em zero: configure um `PROXY_VALIDATION_URL` acessível pelo worker e rode `npm run maintenance`.
- Job manual parado em `PENDING`: confirme que `npm run worker` está ativo.
- Registros `TESTING` abandonados por crash são restaurados para `NEW` após 30 minutos no próximo ciclo.
