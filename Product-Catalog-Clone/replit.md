# Sistema Revendedora de Perfumes

Sistema de gestão para revendedora de perfumes árabes e franceses. Permite cadastrar produtos (com dados extraídos da Atlântico Stor), gerenciar consultoras de vendas, definir comissões por consultora e emitir pedidos de venda.

## Run & Operate

- `pnpm --filter @workspace/revendedora run dev` — frontend (porta configurada pelo Replit)
- `pnpm --filter @workspace/api-server run dev` — API server (porta configurada pelo Replit)
- `pnpm run typecheck` — typecheck completo de todos os pacotes
- `pnpm run build` — typecheck + build
- `pnpm --filter @workspace/api-spec run codegen` — regenerar hooks React Query e schemas Zod a partir do spec OpenAPI
- `pnpm --filter @workspace/db run push` — aplicar mudanças de schema no DB (apenas dev)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, Wouter (routing), TanStack Query, shadcn/ui, Tailwind CSS
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validação: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (a partir do spec OpenAPI)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — spec OpenAPI (fonte da verdade para contratos)
- `lib/db/src/schema/` — schema do banco (products.ts, consultants.ts, orders.ts)
- `artifacts/api-server/src/routes/` — rotas da API (products, consultants, orders, dashboard)
- `artifacts/revendedora/src/pages/` — páginas do frontend
- `lib/api-client-react/src/generated/` — hooks gerados (não editar manualmente)
- `lib/api-zod/src/generated/` — schemas Zod gerados (não editar manualmente)

## Architecture decisions

- Valores monetários sempre em centavos no banco e na API; formatar no frontend com `toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })`
- Tipos `integer` no OpenAPI spec devem ser `type: number` (não `type: integer`) — Orval 8.23 gera `zod.int()` para `integer`, que não existe no Zod v3
- Produtos com imagens direto do CDN da Atlântico Stor (`media-n.atlanticostor.com.br`)
- Comissão calculada no momento da criação do pedido: `totalAmount * (commissionRate / 100)`

## Product

- **Dashboard** (`/`): Faturamento total, comissões pagas, pedidos pendentes, top consultoras, pedidos recentes
- **Catálogo** (`/produtos`): Grid de produtos com imagens; cadastrar/editar/excluir
- **Consultoras** (`/consultoras`): Cadastro de consultoras com % de comissão individual; ver stats por consultora
- **Pedidos** (`/pedidos`): Listagem com filtros; criar novo pedido selecionando consultora e produtos; acompanhar status
- **Novo Pedido** (`/pedidos/novo`): Interface de carrinho; calcula comissão ao vivo

## User preferences

_Nenhuma preferência explícita registrada ainda._

## Gotchas

- Não usar `type: integer` no OpenAPI spec — usar `type: number`. O Orval v8.23 gera `zod.int()` para `integer`, que não existe no Zod v3 (workspace usa `^3.25.76`).
- Sempre rodar codegen após mudar o `openapi.yaml`: `pnpm --filter @workspace/api-spec run codegen`
- Verificar artifacts com `pnpm --filter @workspace/<slug> run typecheck`, não `build` (o build precisa de PORT e BASE_PATH do workflow)

## Pointers

- Ver skill `pnpm-workspace` para estrutura do workspace, TypeScript e detalhes de pacotes
