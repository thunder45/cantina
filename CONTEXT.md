# CONTEXT.md - Cantina POS System

## 1. VISÃO GERAL DO PRODUTO

### Propósito
Sistema de Ponto de Venda (POS) para cantinas de eventos religiosos/comunitários. Gerencia vendas, estoque, clientes com crédito (fiado), e relatórios financeiros.

### Público-Alvo
- **Operadores de caixa**: Registram vendas durante eventos
- **Administradores**: Configuram eventos, menus, categorias e visualizam relatórios
- **Clientes**: Famílias que compram a crédito e pagam posteriormente

### Principais Funcionalidades
- Gestão de eventos com múltiplas datas e categorias (Culto, Casais, Kids)
- Menu dinâmico por evento com controle de estoque
- Vendas com múltiplas formas de pagamento (cash, card, PIX, balance, credit)
- Sistema de crédito (fiado) com FIFO automático para pagamentos
- Relatórios por evento, categoria e global
- Histórico completo de transações por cliente

---

## 2. ARQUITETURA

### Stack Tecnológico

| Camada | Tecnologia | Versão |
|--------|------------|--------|
| Frontend | React + TypeScript | 18.2 / 5.3 |
| Build Tool | Vite | 5.4 |
| Backend | Node.js + TypeScript | 18+ / 5.3 |
| Runtime | AWS Lambda | Node 18.x |
| API | API Gateway REST | - |
| Database | DynamoDB | - |
| CDN | CloudFront | - |
| Storage | S3 | - |
| IaC | AWS CDK | 2.x |
| Auth | Cognito (opcional) | - |

### Estrutura de Diretórios

```
cantina/
├── packages/
│   ├── shared/           # Tipos, API client, design tokens
│   │   └── src/
│   │       ├── types/    # Interfaces TypeScript
│   │       ├── api/      # ApiClient e services
│   │       └── design/   # Colors, Spacing, FontSizes
│   │
│   ├── backend/          # Lambda + Express (dev)
│   │   └── src/
│   │       ├── api/
│   │       │   ├── handlers/   # Um handler por domínio
│   │       │   ├── router.ts   # Roteamento de paths
│   │       │   ├── response.ts # Helpers de resposta
│   │       │   └── validation.ts
│   │       ├── services/       # Lógica de negócio
│   │       └── repositories/   # Acesso a dados
│   │
│   ├── frontend-web/     # React SPA
│   │   └── src/
│   │       ├── components/     # Por domínio (sales, customers, reports)
│   │       ├── pages/          # Páginas principais
│   │       ├── auth/           # Contexto de autenticação
│   │       └── hooks/          # Custom hooks
│   │
│   └── infra/            # CDK Stack
│       └── src/
│           └── cantina-stack.ts
```

### Diagrama de Arquitetura

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  CloudFront │────▶│     S3      │     │   Cognito   │
│   (CDN)     │     │  (Frontend) │     │   (Auth)    │
└─────────────┘     └─────────────┘     └─────────────┘
       │                                       │
       ▼                                       ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ API Gateway │────▶│   Lambda    │────▶│  DynamoDB   │
│   (REST)    │     │  (Backend)  │     │  (9 tables) │
└─────────────┘     └─────────────┘     └─────────────┘
```

### Tabelas DynamoDB

| Tabela | PK | GSI |
|--------|----|----|
| cantina-categories | id | - |
| cantina-events | id | categoryId-index |
| cantina-menu-items | id | eventId-index |
| cantina-menu-groups | id | eventId-index |
| cantina-orders | id | eventId-index |
| cantina-sales | id | eventId-index, customerId-index |
| cantina-customers | id | - (transações usam pk=customerId) |
| cantina-catalog-items | id | - |
| cantina-audit-logs | id | - |

---

## 3. DECISÕES DE DESIGN FUNDAMENTAIS

### 3.1 Monorepo com npm Workspaces

**Decisão**: Usar npm workspaces em vez de Lerna/Nx.

**Motivo**: Simplicidade. O projeto é pequeno o suficiente para não precisar de ferramentas complexas.

**Implicação**: Use `npm run build --workspace=@cantina-pos/backend` para builds específicos.

### 3.2 Shared Package para Tipos

**Decisão**: Todos os tipos TypeScript ficam em `@cantina-pos/shared`.

**Motivo**: Garantir consistência entre frontend e backend. Evitar duplicação.

**Implicação**: Sempre importe tipos do shared: `import { Customer } from '@cantina-pos/shared'`

### 3.3 Repository Pattern com Dual Mode

**Decisão**: Repositories funcionam com Map<> local (dev) ou DynamoDB (prod).

**Motivo**: Permitir desenvolvimento local sem AWS. Testes rápidos sem mocks.

```typescript
const isProduction = !!process.env.CUSTOMERS_TABLE;

if (isProduction) {
  await docClient.send(new PutCommand({ TableName, Item }));
} else {
  customers.set(id, customer);
}
```

**Implicação**: Nunca acesse DynamoDB diretamente nos services. Sempre via repository.

### 3.4 FIFO para Pagamentos de Crédito

**Decisão**: Depósitos pagam compras antigas primeiro (First In, First Out).

**Motivo**: Justo para o cliente. Compras mais antigas são quitadas primeiro.

**Campos envolvidos**:
- `CustomerTransaction.amountPaid`: Quanto desta compra já foi pago
- `Sale.payments`: Array com breakdown (balance vs credit)

**Implementação atômica** (desde 2026-01-05):
- `applyPaymentFIFO` usa `TransactWriteCommand` em batches de 10 purchases (20 items max)
- Em caso de falha, `reconciliationService.handleFIFOFailure()` tenta reconciliar
- Job de reconciliação semanal verifica consistência de todos os clientes

**Arquivos relacionados**:
- `src/services/customer.service.ts` - `applyPaymentFIFO()`, `buildUpdatedSalePayments()`
- `src/services/reconciliation.service.ts` - `reconcileCustomer()`, `reconcileAll()`
- `src/repositories/dynamodb-transactions.ts` - `executeTransaction()`, `executeTransactionBatches()`

### 3.5 Soft Delete para Clientes

**Decisão**: Clientes não são deletados fisicamente. Usam `deletedAt`.

**Motivo**: Preservar histórico de transações e integridade referencial.

### 3.6 Ambiente Beta Separado

**Decisão**: Beta usa prefixo `beta-` em todas as tabelas e subdomínio `cantina-beta`.

**Motivo**: Testar mudanças sem afetar produção.

**URLs**:
- Beta: https://cantina-beta.advm.lu
- Produção: https://cantina.advm.lu

**Deploy beta**:
```bash
# Backend
cd packages/infra
npx cdk deploy CantinaBetaStack -c subDomain=cantina-beta --profile cantina --require-approval never

# Frontend
cd packages/frontend-web
VITE_API_URL="https://cantina-beta.advm.lu" VITE_SKIP_AUTH=true npm run build
aws s3 sync dist/ s3://beta-cantina-frontend-625272706584 --delete --profile cantina
aws cloudfront create-invalidation --distribution-id E3RFATVK47GGJ7 --paths "/*" --profile cantina
```

**Deploy produção**:
```bash
# Backend
cd packages/infra
npx cdk deploy CantinaStack --profile cantina --require-approval never

# Frontend
cd packages/frontend-web
VITE_API_URL="https://cantina.advm.lu" npm run build
aws s3 sync dist/ s3://cantina-frontend-625272706584 --delete --profile cantina
aws cloudfront create-invalidation --distribution-id E7R30G3Z8J2DI --paths "/*" --profile cantina
```

### 3.7 Arquivos de Infraestrutura

| Arquivo | Propósito |
|---------|-----------|
| `repositories/dynamodb-transactions.ts` | Helper para `TransactWriteCommand` com batches |
| `services/reconciliation.service.ts` | Detecta e corrige inconsistências FIFO |

---

## 4. PADRÕES E CONVENÇÕES

### 4.1 Naming Conventions

| Elemento | Convenção | Exemplo |
|----------|-----------|---------|
| Arquivos TS | kebab-case | `customer.service.ts` |
| Componentes React | PascalCase | `CustomerHistory.tsx` |
| Funções | camelCase | `getCustomerBalance()` |
| Interfaces | PascalCase | `CustomerTransaction` |
| Constantes | UPPER_SNAKE | `BATCH_SIZE` |
| Tabelas DynamoDB | kebab-case | `cantina-customers` |
| Erros | ERR_UPPER_SNAKE | `ERR_CUSTOMER_NOT_FOUND` |

### 4.2 Estrutura de Handler

```typescript
// packages/backend/src/api/handlers/[domain].handler.ts

export async function handler(event: APIGatewayEvent): Promise<APIGatewayResponse> {
  const { httpMethod, pathParameters, path } = event;
  const resourceId = pathParameters?.id;

  try {
    if (httpMethod === 'GET' && resourceId) {
      return await getResource(resourceId);
    }
    if (httpMethod === 'POST' && !resourceId) {
      return await createResource(event);
    }
    // ... mais rotas
    return error('ERR_METHOD_NOT_ALLOWED', 'Método não permitido', 405);
  } catch (err) {
    return handleError(err);
  }
}
```

### 4.3 Estrutura de Service

```typescript
// packages/backend/src/services/[domain].service.ts

import * as repository from '../repositories/[domain].repository';

export async function getById(id: string): Promise<Entity> {
  const entity = await repository.getById(id);
  if (!entity) throw new Error('ERR_NOT_FOUND');
  return entity;
}

export async function create(input: CreateInput): Promise<Entity> {
  // Validações de negócio
  if (!input.name?.trim()) throw new Error('ERR_EMPTY_NAME');
  
  // Delegue persistência ao repository
  return repository.create(input);
}
```

### 4.4 Estrutura de Repository

```typescript
// packages/backend/src/repositories/[domain].repository.ts

const TABLE_NAME = process.env.[DOMAIN]_TABLE;
const isProduction = !!TABLE_NAME;

// In-memory para dev
let entities: Map<string, Entity> = new Map();

export async function getById(id: string): Promise<Entity | undefined> {
  if (isProduction) {
    const result = await docClient.send(new GetCommand({ TableName: TABLE_NAME, Key: { id } }));
    return result.Item as Entity | undefined;
  }
  return entities.get(id);
}
```

### 4.5 Tratamento de Erros

Use códigos de erro padronizados:

```typescript
// No service
throw new Error('ERR_CUSTOMER_NOT_FOUND');
throw new Error('ERR_INVALID_AMOUNT');
throw new Error('ERR_CUSTOMER_HAS_SALES');

// No handler - handleError converte para HTTP
return handleError(err); // Mapeia ERR_* para status codes
```

### 4.6 Componentes React

```typescript
// packages/frontend-web/src/components/[domain]/[Component].tsx

interface ComponentProps {
  apiClient: ApiClient;
  entity: Entity;
  onAction: () => void;
}

export const Component: React.FC<ComponentProps> = ({
  apiClient,
  entity,
  onAction,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const service = new EntityApiService(apiClient);
  
  // ... lógica
  
  return (
    <div style={{ padding: Spacing.md }}>
      {/* Use design tokens do shared */}
    </div>
  );
};
```

---

## 5. ANTI-PATTERNS E REGRAS CRÍTICAS

### ⚠️ NUNCA Faça

1. **Nunca acesse DynamoDB diretamente em services**
   ```typescript
   // ❌ ERRADO
   await docClient.send(new GetCommand(...));
   
   // ✅ CORRETO
   await repository.getById(id);
   ```

2. **Nunca crie tipos duplicados**
   ```typescript
   // ❌ ERRADO - tipo local
   interface Customer { ... }
   
   // ✅ CORRETO - importe do shared
   import { Customer } from '@cantina-pos/shared';
   ```

3. **Nunca use `any` sem justificativa**
   ```typescript
   // ❌ ERRADO
   const data: any = response;
   
   // ✅ CORRETO
   const data = response as CustomerTransaction;
   ```

4. **Nunca delete dados em produção sem backup**
   ```bash
   # ❌ ERRADO
   aws dynamodb delete-item ...
   
   # ✅ CORRETO - primeiro backup
   aws dynamodb scan --table-name X > backup.json
   ```

5. **Nunca faça deploy de frontend sem invalidar CloudFront**
   ```bash
   # ❌ INCOMPLETO
   aws s3 sync dist/ s3://bucket
   
   # ✅ CORRETO
   aws s3 sync dist/ s3://bucket
   aws cloudfront create-invalidation --distribution-id X --paths "/*"
   ```

### 🚨 Armadilhas Conhecidas

1. **Input de números negativos em React**
   - Problema: `useState<number>` não permite digitar "-" antes do número
   - Solução: Use `useState<string>` e converta no submit
   ```typescript
   const [valueStr, setValueStr] = useState('0');
   const value = parseFloat(valueStr) || 0;
   ```

2. **CloudFront cache agressivo**
   - Problema: Usuários veem versão antiga após deploy
   - Solução: Sempre invalidar após deploy + hard refresh no browser

3. **Transações DynamoDB - Atomicidade**
   - Problema: Operações que atualizam múltiplos items podem falhar parcialmente
   - Solução: `TransactWriteCommand` para operações críticas (limite: 25 items)
   - Para FIFO com muitas compras: batches de 20 items + reconciliação automática em falha
   - Arquivos: `dynamodb-transactions.ts`, `reconciliation.service.ts`

4. **GSI eventual consistency**
   - Problema: Query em GSI pode não retornar item recém-criado
   - Solução: Para leituras críticas, use GetItem com PK

---

## 6. WORKFLOWS E PROCESSOS

### 6.1 Adicionar Nova Feature

1. Crie branch: `git checkout -b feature/nome-da-feature`
2. Adicione tipos em `packages/shared/src/types/`
3. Implemente repository em `packages/backend/src/repositories/`
4. Implemente service em `packages/backend/src/services/`
5. Adicione handler em `packages/backend/src/api/handlers/`
6. Registre rotas em `packages/backend/src/api/router.ts`
7. Adicione API client em `packages/shared/src/api/services.ts`
8. Implemente componentes React
9. Teste localmente: `npm run dev` em backend e frontend
10. Deploy beta, teste, merge para main, deploy prod (ver seção 3.6)

### 6.2 Build Completo

```bash
# Build shared + backend
npm run build --workspace=@cantina-pos/shared
npm run build:lambda --workspace=@cantina-pos/backend
```

Ver seção **3.6 Ambiente Beta Separado** para comandos de deploy.

### 6.3 Corrigir Dados em Produção

```bash
# 1. SEMPRE faça backup primeiro
aws dynamodb scan --table-name cantina-customers --profile cantina > backup-customers.json

# 2. Use update-item para correções pontuais
aws dynamodb update-item --table-name cantina-customers \
  --key '{"id":{"S":"xxx"}}' \
  --update-expression "SET amountPaid = :ap" \
  --expression-attribute-values '{":ap":{"N":"100"}}' \
  --profile cantina
```

---

## 7. DEPENDÊNCIAS E INTEGRAÇÕES

### Bibliotecas Obrigatórias

| Package | Uso | Versão |
|---------|-----|--------|
| @aws-sdk/client-dynamodb | Acesso DynamoDB | ^3.946 |
| @aws-sdk/lib-dynamodb | Document client | ^3.946 |
| uuid | Geração de IDs | ^9.0 |
| react | UI | ^18.2 |
| vite | Build frontend | ^5.4 |
| aws-cdk-lib | Infraestrutura | ^2.x |

### Variáveis de Ambiente (Lambda)

```
CUSTOMERS_TABLE=cantina-customers
SALES_TABLE=cantina-sales
EVENTS_TABLE=cantina-events
CATEGORIES_TABLE=cantina-categories
MENU_ITEMS_TABLE=cantina-menu-items
MENU_GROUPS_TABLE=cantina-menu-groups
ORDERS_TABLE=cantina-orders
CATALOG_ITEMS_TABLE=cantina-catalog-items
AUDIT_LOGS_TABLE=cantina-audit-logs
SESSIONS_TABLE=cantina-sessions
COGNITO_USER_POOL_ID=xxx (opcional)
SKIP_AUTH=true (beta only)
```

### Variáveis de Ambiente (Frontend)

```
VITE_API_URL=https://cantina.advm.lu
VITE_SKIP_AUTH=true (beta only)
```

---

## 8. EXEMPLOS DE REFERÊNCIA

### 8.1 Novo Repository

```typescript
// packages/backend/src/repositories/example.repository.ts
import { Example } from '@cantina-pos/shared';
import { v4 as uuidv4 } from 'uuid';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';

const TABLE_NAME = process.env.EXAMPLES_TABLE;
const isProduction = !!TABLE_NAME;

let docClient: DynamoDBDocumentClient | null = null;
if (isProduction) {
  docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
}

let examples: Map<string, Example> = new Map();

export async function create(name: string): Promise<Example> {
  const example: Example = {
    id: uuidv4(),
    name,
    createdAt: new Date().toISOString(),
    version: 1,
  };

  if (isProduction) {
    await docClient!.send(new PutCommand({ TableName: TABLE_NAME, Item: example }));
  } else {
    examples.set(example.id, example);
  }
  return example;
}

export async function getById(id: string): Promise<Example | undefined> {
  if (isProduction) {
    const result = await docClient!.send(new GetCommand({ TableName: TABLE_NAME, Key: { id } }));
    return result.Item as Example | undefined;
  }
  return examples.get(id);
}

export async function getAll(): Promise<Example[]> {
  if (isProduction) {
    const result = await docClient!.send(new ScanCommand({ TableName: TABLE_NAME }));
    return (result.Items || []) as Example[];
  }
  return Array.from(examples.values());
}

// Para testes
export function resetRepository(): void {
  examples.clear();
}
```

### 8.2 Novo Service

```typescript
// packages/backend/src/services/example.service.ts
import { Example } from '@cantina-pos/shared';
import * as exampleRepository from '../repositories/example.repository';

export async function create(name: string): Promise<Example> {
  if (!name?.trim()) throw new Error('ERR_EMPTY_NAME');
  return exampleRepository.create(name.trim());
}

export async function getById(id: string): Promise<Example> {
  const example = await exampleRepository.getById(id);
  if (!example) throw new Error('ERR_EXAMPLE_NOT_FOUND');
  return example;
}

export async function getAll(): Promise<Example[]> {
  return exampleRepository.getAll();
}
```

### 8.3 Novo Handler

```typescript
// packages/backend/src/api/handlers/examples.handler.ts
import { APIGatewayEvent, APIGatewayResponse } from '../types';
import { success, created, handleError, error } from '../response';
import { parseBody } from '../validation';
import * as exampleService from '../../services/example.service';

interface CreateExampleBody {
  name: string;
}

export async function handler(event: APIGatewayEvent): Promise<APIGatewayResponse> {
  const { httpMethod, pathParameters } = event;
  const exampleId = pathParameters?.id;

  try {
    if (httpMethod === 'POST' && !exampleId) {
      const body = parseBody<CreateExampleBody>(event.body);
      if (!body) return error('ERR_INVALID_BODY', 'Corpo inválido', 400);
      const example = await exampleService.create(body.name);
      return created(example);
    }
    if (httpMethod === 'GET' && exampleId) {
      const example = await exampleService.getById(exampleId);
      return success(example);
    }
    if (httpMethod === 'GET' && !exampleId) {
      const examples = await exampleService.getAll();
      return success(examples);
    }
    return error('ERR_METHOD_NOT_ALLOWED', 'Método não permitido', 405);
  } catch (err) {
    return handleError(err);
  }
}
```

### 8.4 Componente React com API

```typescript
// packages/frontend-web/src/components/examples/ExampleList.tsx
import React, { useState, useEffect } from 'react';
import { Example, ApiClient, Colors, Spacing, FontSizes } from '@cantina-pos/shared';

interface ExampleListProps {
  apiClient: ApiClient;
  onSelect: (example: Example) => void;
}

export const ExampleList: React.FC<ExampleListProps> = ({ apiClient, onSelect }) => {
  const [examples, setExamples] = useState<Example[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadExamples();
  }, []);

  const loadExamples = async () => {
    try {
      setLoading(true);
      const data = await apiClient.get<Example[]>('/examples');
      setExamples(data);
    } catch (err) {
      setError('Erro ao carregar exemplos');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Carregando...</div>;
  if (error) return <div style={{ color: Colors.error }}>{error}</div>;

  return (
    <div style={{ padding: Spacing.md }}>
      {examples.map(example => (
        <div
          key={example.id}
          onClick={() => onSelect(example)}
          style={{
            padding: Spacing.sm,
            marginBottom: Spacing.xs,
            backgroundColor: Colors.background,
            borderRadius: 4,
            cursor: 'pointer',
          }}
        >
          <span style={{ fontSize: FontSizes.md }}>{example.name}</span>
        </div>
      ))}
    </div>
  );
};
```

---

## 9. HISTÓRICO DE MUDANÇAS INCREMENTAIS

### Janeiro 2026

#### Remoção Completa do creditLimit (Task 002)
- **Mudança**: Campo `creditLimit` removido completamente do sistema
- **Removido de**: Customer interface, createCustomer, updateCreditLimit, canPurchase, rota /credit-limit
- **Motivo**: Clientes podem comprar a crédito sem limite - campo não era mais usado

#### Transações DynamoDB Atômicas (Task 001)
- **Mudança**: `applyPaymentFIFO` agora usa `TransactWriteCommand` em batches
- **Arquivos**: `dynamodb-transactions.ts`, `reconciliation.service.ts`, `customer.service.ts`
- **Motivo**: Garantir consistência entre CustomerTransaction e Sale.payments

#### FIFO Auto-Pay from Balance
- **Mudança**: Compras a crédito agora usam saldo positivo automaticamente
- **Motivo**: Se cliente tem €200 de saldo e compra €275, €200 é pago do saldo
- **Implementação**: `recordPurchase()` calcula `effectivePaidAmount` baseado no saldo

#### Delete Customer
- **Mudança**: Adicionada funcionalidade de apagar cliente
- **Regra**: Só permite se cliente não tiver transações de compra
- **Endpoint**: `DELETE /customers/{id}`

#### Collapsible Header no CustomerHistory
- **Mudança**: Header com nome e saldo pode ser colapsado
- **Motivo**: Economizar espaço vertical, mostrar mais transações

### Dezembro 2025

#### Global Reports
- **Mudança**: Adicionado relatório global independente de evento
- **Motivo**: Ver todas as vendas com filtros por categoria, evento, período
- **Tipos**: `GlobalReport`, `GlobalReportFilter`, `GlobalSaleDetail`

#### Customer History Enrichment
- **Mudança**: Transações de compra agora incluem dados do evento/categoria
- **Campos adicionados**: `eventId`, `eventName`, `categoryId`, `categoryName`, `items`

#### Beta Environment
- **Mudança**: Criado ambiente beta separado
- **Configuração**: Prefixo `beta-` nas tabelas, subdomínio `cantina-beta`
- **Auth**: `skipAuth=true` para testes

---

## 10. CASOS DE USO PRINCIPAIS

### 10.1 Venda a Crédito (Fiado)

**Fluxo**:
1. Operador seleciona items do menu
2. Seleciona cliente
3. Escolhe pagamento "Fiado" (credit)
4. Sistema verifica saldo do cliente
5. Se saldo positivo, usa automaticamente (FIFO)
6. Cria `Sale` com payments breakdown
7. Cria `CustomerTransaction` tipo `purchase` com `amountPaid`

**Regras de Negócio**:
- Saldo positivo é usado automaticamente
- `amountPaid` = min(saldo_disponível, valor_compra)
- `Sale.payments` reflete: balance (pago) + credit (pendente)

**Componentes**: `PaymentModal`, `CustomerSelectModal`, `sales.service.ts`

### 10.2 Depósito de Cliente

**Fluxo**:
1. Operador acessa histórico do cliente
2. Clica "Depositar"
3. Informa valor e método de pagamento
4. Sistema cria transação de depósito
5. Aplica FIFO: paga compras antigas primeiro
6. Atualiza `amountPaid` das compras
7. Atualiza `Sale.payments` (credit → balance)

**Regras de Negócio**:
- Depósito negativo = correção/estorno
- FIFO: compras mais antigas são pagas primeiro
- `Sale.payments` é sincronizado automaticamente

**Componentes**: `TransactionModal`, `CustomerHistory`, `customer.service.ts`

### 10.3 Relatório de Evento

**Fluxo**:
1. Admin acessa página de relatórios
2. Seleciona evento
3. Sistema busca todas as vendas do evento
4. Calcula totais: vendas, pago, pendente, estornado
5. Agrupa por item vendido e método de pagamento
6. Exibe lista de vendas com status de pagamento

**Regras de Negócio**:
- `isPaid`: true se não tem pagamento `credit` ou `credit.amount = 0`
- Vendas com `credit > 0` mostram badge "Fiado"
- Vendas parcialmente pagas mostram "Fiado (parcial)"

**Componentes**: `EventReportView`, `report.service.ts`

### 10.4 Criar Novo Evento

**Fluxo**:
1. Admin seleciona categoria (Culto, Casais, Kids)
2. Informa nome e datas do evento
3. Sistema cria evento vinculado à categoria
4. Admin monta menu: adiciona items do catálogo
5. Configura preços e estoque por item
6. Evento fica pronto para vendas

**Regras de Negócio**:
- Evento pertence a uma categoria
- Menu é específico por evento
- Estoque 0 = infinito (sem controle)

**Componentes**: `EventForm`, `CategoryList`, `AddMenuItemForm`

---

## Checklist para Novos Desenvolvedores

- [ ] Leia este documento completamente
- [ ] Configure AWS CLI com profile `cantina`
- [ ] Clone o repo e rode `npm install`
- [ ] Teste localmente: `npm run dev` em backend e frontend
- [ ] Faça uma mudança pequena e deploy para beta
- [ ] Verifique os logs no CloudWatch se algo falhar
- [ ] Pergunte antes de fazer deploy em produção
