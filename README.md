# Sistema POS Cantina

Sistema de Ponto de Venda para Cantinas com gestão de eventos, menus, vendas, estoque e pagamentos.

## 🌐 Ambientes

| Ambiente | URL | Auth | Dados |
|----------|-----|------|-------|
| **Produção** | https://cantina.advm.lu | Zoho OAuth (domínio @advm.lu) | Dados reais |
| **Beta** | https://cantina-beta.advm.lu | Sem auth (VITE_SKIP_AUTH=true) | Dados de teste |
| **Local** | http://localhost:3000 | Sem auth | In-memory |

## 🏗️ Infraestrutura AWS

- **Região:** eu-west-1
- **Account:** 625272706584
- **Profile AWS CLI:** `cantina`

### Recursos por Ambiente

| Recurso | Produção | Beta |
|---------|----------|------|
| CloudFront | cantina.advm.lu | cantina-beta.advm.lu |
| S3 Frontend | cantina-frontend-625272706584 | beta-cantina-frontend-625272706584 |
| Lambda | cantina-api | beta-cantina-api |
| DynamoDB | cantina-* (11 tabelas) | beta-cantina-* (11 tabelas) |

### Tabelas DynamoDB (com PITR habilitado)
- `cantina-categories`, `cantina-events`, `cantina-menu-items`
- `cantina-orders`, `cantina-sales`, `cantina-customers`
- `cantina-customer-transactions`, `cantina-menu-groups`
- `cantina-catalog-items`, `cantina-audit-logs`
- `cantina-sessions` (sem PITR, dados efémeros com TTL)

## 🚀 Deploy

### Backend (Lambda via CDK)

```bash
cd packages/backend
npm run build:lambda

cd ../infra
# Beta
npx cdk deploy --context subDomain=cantina-beta --profile cantina --require-approval never

# Produção
npx cdk deploy --profile cantina --require-approval never
```

### Frontend (S3 + CloudFront)

```bash
cd packages/frontend-web

# Beta
VITE_SKIP_AUTH=true VITE_API_URL=https://cantina-beta.advm.lu npm run build
aws s3 sync dist/ s3://beta-cantina-frontend-625272706584 --delete --profile cantina
aws cloudfront create-invalidation --distribution-id E3RFATVK47GGJ7 --paths "/*" --profile cantina

# Produção
npm run build
aws s3 sync dist/ s3://cantina-frontend-625272706584 --delete --profile cantina
aws cloudfront create-invalidation --distribution-id E7R30G3Z8J2DI --paths "/*" --profile cantina
```

## 🚀 Quick Start - Local

```bash
# Instalar dependências
npm install

# Terminal 1: Backend
cd packages/backend && npm run dev

# Terminal 2: Frontend
cd packages/frontend-web && npm start
```

## 📋 Scripts

### Backend (`packages/backend`)
- `npm run dev` - Servidor local (Express, porta 3001)
- `npm run build` - Compila TypeScript
- `npm run build:lambda` - Bundle para Lambda (esbuild)
- `npm test` - 221 testes unitários

### Frontend (`packages/frontend-web`)
- `npm start` - Dev server (porta 3000)
- `npm run build` - Build produção (Vite)
- `npm test` - Testes React

### Shared (`packages/shared`)
- `npm run build` - Compila tipos (necessário antes de backend/frontend)

## 📊 Estrutura do Projeto

```
cantina/
├── packages/
│   ├── shared/          # Tipos, API client, design system
│   ├── backend/         # Services, repositories, API, Lambda
│   ├── frontend-web/    # React web app
│   └── infra/           # CDK stacks (AWS infrastructure)
├── package.json         # Workspace root
└── README.md
```

## 💳 Métodos de Pagamento

| Método | Código | Descrição |
|--------|--------|-----------|
| Dinheiro | `cash` | Pagamento em espécie |
| Cartão | `card` | Cartão débito/crédito |
| Transferência | `transfer` | Transferência bancária |
| Fiado | `credit` | Venda a crédito (gera dívida) |
| Saldo | `balance` | Usa saldo do cliente |
| Oferta | `gift` | Cortesia (não gera receita) |

## ✨ Features

- ✅ Gestão de eventos com múltiplas datas e categorias
- ✅ Catálogo de items reutilizável
- ✅ Menu dinâmico por evento
- ✅ Controle de estoque (incluindo infinito com stock=0)
- ✅ Vendas com múltiplas formas de pagamento
- ✅ Pagamento misto (ex: €5 cash + €3 card)
- ✅ Sistema de crédito (fiado) com clientes
- ✅ Sistema de ofertas/cortesias com tracking
- ✅ Pagamentos parciais de dívidas (FIFO)
- ✅ Estorno de vendas com motivo
- ✅ Recibos detalhados
- ✅ Relatórios com filtros (evento, categoria, período, pagamento, cliente)
- ✅ Exportação CSV
- ✅ Audit log completo
- ✅ Auth via Zoho OAuth (produção)
- ✅ Point-in-Time Recovery (backup 35 dias)

## 🔧 Tecnologias

- **Backend:** TypeScript, Express (local), Lambda (prod), DynamoDB
- **Frontend:** React 18, TypeScript, Vite
- **Infra:** AWS CDK, CloudFront, S3, API Gateway, Route53
- **Auth:** Zoho OAuth 2.0 (produção)
- **Testing:** Jest

## 📱 Plataformas

- ✅ Web Browser (desktop/tablet/mobile)
- ✅ Android Tablet (principal uso)
- ✅ iOS Safari

## 📄 Documentação Adicional

- `requirements.md` - Requirements funcionais
- `design.md` - Design técnico
- `tasks.md` - Histórico de implementação

---

**Status:** ✅ Em produção com usuários reais
