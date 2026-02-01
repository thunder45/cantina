# CONTEXT.md - Cantina POS System

> Documento de referência para desenvolvimento e manutenção do sistema.
> Última atualização: Fevereiro 2026

---

## 1. VISÃO GERAL DO PRODUTO

### Propósito
Sistema de Ponto de Venda (POS) para cantinas de eventos religiosos/comunitários. Gerencia eventos, menus, vendas, estoque, clientes e pagamentos.

### Público-Alvo
- **Operadores de caixa**: Voluntários em tablets Android durante eventos
- **Gestores**: Administradores que configuram eventos e analisam relatórios
- **Clientes**: Participantes que compram produtos (alguns com sistema de crédito/fiado)

### Funcionalidades Principais
- Gestão de eventos com múltiplas datas e categorias
- Catálogo de produtos reutilizável entre eventos
- Menu dinâmico por evento com controle de estoque
- Vendas com 6 formas de pagamento (incluindo misto)
- Sistema de crédito (fiado) com FIFO para pagamentos
- Relatórios com filtros e exportação CSV
- Suporte multi-idioma (PT/EN/FR)

---

## 2. ARQUITETURA

### Stack Tecnológico

| Camada | Tecnologia | Versão |
|--------|------------|--------|
| Frontend | React + TypeScript | 18.x |
| Build Tool | Vite | 5.x |
| Backend | Node.js + TypeScript | 20.x |
| Runtime Prod | AWS Lambda | Node 20 |
| Runtime Local | Express | 4.x |
| Database | DynamoDB | - |
| Infra | AWS CDK | 2.x |
| Auth | Zoho OAuth 2.0 | - |
| i18n | react-i18next | 14.x |
| Validation | Zod | 3.x |
| Testing | Jest | 29.x |

### Estrutura de Diretórios

```
cantina/
├── packages/
│   ├── shared/           # Tipos, API client, design system, i18n
│   │   └── src/
│   │       ├── types/    # Interfaces TypeScript compartilhadas
│   │       ├── api/      # ApiClient e services
│   │       ├── components/ # Design tokens e style generators
│   │       ├── i18n/     # Configuração e locales (pt/en/fr)
│   │       └── state/    # Reducer e tipos de estado
│   │
│   ├── backend/          # API e lógica de negócio
│   │   └── src/
│   │       ├── api/      # Handlers, router, validation
│   │       ├── services/ # Lógica de negócio
│   │       ├── repositories/ # Acesso a dados (DynamoDB)
│   │       └── auth/     # Zoho OAuth, sessions
│   │
│   ├── frontend-web/     # React SPA
│   │   └── src/
│   │       ├── pages/    # Páginas principais
│   │       ├── components/ # Componentes por domínio
│   │       ├── hooks/    # Custom hooks (usePlatform, etc)
│   │       ├── auth/     # AuthContext, ProtectedRoute
│   │       └── styles/   # Responsive utilities
│   │
│   └── infra/            # CDK stacks
│       └── src/
│           └── cantina-stack.ts
```

### Fluxo de Dados

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Frontend  │────▶│  CloudFront │────▶│   Lambda    │
│   (React)   │     │   + S3      │     │  (Express)  │
└─────────────┘     └─────────────┘     └─────────────┘
                                              │
                    ┌─────────────────────────┼─────────────────────────┐
                    ▼                         ▼                         ▼
              ┌──────────┐            ┌──────────────┐          ┌──────────┐
              │ DynamoDB │            │ Secrets Mgr  │          │  Zoho    │
              │ (11 tabs)│            │ (OAuth keys) │          │  OAuth   │
              └──────────┘            └──────────────┘          └──────────┘
```

### Ambientes

| Ambiente | URL | Auth | Prefixo DynamoDB |
|----------|-----|------|------------------|
| Produção | cantina.advm.lu | Zoho OAuth | `cantina-*` |
| Beta | cantina-beta.advm.lu | Desabilitado | `beta-cantina-*` |
| Local | localhost:3000/3001 | Desabilitado | In-memory |

---

## 3. DECISÕES DE DESIGN FUNDAMENTAIS

### 3.1 Monorepo com Workspaces NPM

**Decisão**: Usar npm workspaces com pacote `shared` para tipos e utilitários.

**Motivo**: 
- Tipos compartilhados entre frontend e backend
- Design system consistente
- Build único do shared antes de outros pacotes

**Implicação**: Sempre execute `npm run build` no `shared` antes de buildar outros pacotes.

### 3.2 Stock Zero = Infinito

**Decisão**: `stock: 0` significa estoque infinito (sem limite de vendas).

**Motivo**: Simplifica UI - não precisa de checkbox separado para "infinito".

**Código**:
```typescript
// Verificar disponibilidade
const isAvailable = item.stock === 0 || item.soldCount < item.stock;
const availableStock = item.stock === 0 ? Infinity : item.stock - item.soldCount;
```

### 3.3 FIFO para Pagamento de Dívidas

**Decisão**: Pagamentos de dívida aplicam-se às compras mais antigas primeiro (FIFO).

**Motivo**: Transparência e previsibilidade para clientes e operadores.

**Implicação**: Campo `amountPaid` em `CustomerTransaction` rastreia quanto de cada compra foi pago.

### 3.4 Pagamentos Mistos

**Decisão**: Uma venda pode ter múltiplas formas de pagamento.

**Exemplo**: €10 total = €5 cash + €3 card + €2 balance

**Estrutura**:
```typescript
interface Sale {
  payments: PaymentPart[];  // Array, não único método
}
interface PaymentPart {
  method: PaymentMethod;
  amount: number;
}
```

### 3.5 Soft Delete para Clientes

**Decisão**: Clientes com vendas não podem ser deletados fisicamente.

**Motivo**: Preservar integridade de relatórios e histórico.

**Implementação**: Campo `deletedAt` para soft delete.

### 3.6 Optimistic Locking

**Decisão**: Usar campo `version` para controle de concorrência.

**Motivo**: Evitar race conditions em operações críticas (vendas, estoque).

**Código**:
```typescript
// No repository
ConditionExpression: 'version = :currentVersion',
UpdateExpression: 'SET version = version + 1, ...'
```

---

## 4. PADRÕES E CONVENÇÕES

### 4.1 Naming Conventions

| Contexto | Convenção | Exemplo |
|----------|-----------|---------|
| Arquivos TS/TSX | kebab-case | `customer-search.tsx` |
| Componentes React | PascalCase | `CustomerSearch` |
| Funções/variáveis | camelCase | `getCustomerBalance` |
| Constantes | UPPER_SNAKE | `DEFAULT_RETRY_CONFIG` |
| Tipos/Interfaces | PascalCase | `CustomerWithBalance` |
| Tabelas DynamoDB | kebab-case | `cantina-customers` |
| Erros | ERR_UPPER_SNAKE | `ERR_CUSTOMER_NOT_FOUND` |

### 4.2 Estrutura de Componentes React

```typescript
// 1. Imports (react, libs externas, shared, locais)
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Colors, Spacing } from '@cantina-pos/shared';
import { usePlatform } from '../hooks';

// 2. Interface de Props
interface CustomerCardProps {
  customer: Customer;
  onSelect: (id: string) => void;
}

// 3. Componente funcional
export const CustomerCard: React.FC<CustomerCardProps> = ({ customer, onSelect }) => {
  const { t } = useTranslation();
  // ... implementação
};
```

### 4.3 Estrutura de Services (Backend)

```typescript
// services/example.service.ts

// 1. Imports
import { EntityType } from '@cantina-pos/shared';
import * as repository from '../repositories/example.repository';

// 2. Funções públicas (ordem: create, get, update, delete)
export async function createEntity(input: CreateInput): Promise<Entity> {
  // Validação de negócio
  if (!input.name?.trim()) throw new Error('ERR_EMPTY_NAME');
  // Delegação ao repository
  return repository.createEntity(input);
}

// 3. Reset para testes
export function resetService(): void {
  repository.resetRepository();
}
```

### 4.4 Tratamento de Erros

**Backend - Use códigos de erro padronizados**:
```typescript
// ✅ Correto
throw new Error('ERR_CUSTOMER_NOT_FOUND');
throw new Error('ERR_INSUFFICIENT_STOCK');

// ❌ Errado
throw new Error('Customer not found');
throw new Error('Estoque insuficiente');
```

**Frontend - Use i18n para mensagens**:
```typescript
// ✅ Correto
setError(t('errors.customerNotFound'));

// ❌ Errado
setError('Cliente não encontrado');
```

### 4.5 Validação com Zod

```typescript
// schemas.ts
export const CreateCustomerSchema = z.object({
  name: z.string()
    .transform(s => s.trim())
    .pipe(z.string().min(1, 'Nome é obrigatório').max(100)),
  initialBalance: z.number().optional().default(0),
});

// handler.ts
const input = CreateCustomerSchema.parse(body);
```

### 4.6 Testes

**Estrutura de teste**:
```typescript
describe('Sales Service', () => {
  beforeEach(async () => {
    // Reset todos os services/repositories
    salesService.resetService();
    orderService.resetService();
    // Setup dados de teste
  });

  describe('confirmSale', () => {
    it('should confirm a sale with cash payment', async () => {
      // Arrange
      const order = await orderService.createOrder(eventId);
      await orderService.addItem(order.id, { menuItemId, quantity: 2 });
      
      // Act
      const sale = await salesService.confirmSale(
        order.id, 
        [{ method: 'cash', amount: 20 }], 
        'user1'
      );
      
      // Assert
      expect(sale.total).toBe(20);
      expect(sale.payments[0].method).toBe('cash');
    });
  });
});
```

---

## 5. ANTI-PATTERNS E REGRAS CRÍTICAS

### ⚠️ NUNCA faça isso:

#### 5.1 Hardcode de Strings em Português
```typescript
// ❌ PROIBIDO
<button>Cancelar</button>
setError('Erro ao carregar');

// ✅ CORRETO
<button>{t('common.cancel')}</button>
setError(t('errors.loadFailed'));
```

#### 5.2 Acesso Direto ao DynamoDB em Services
```typescript
// ❌ PROIBIDO - Service acessando DynamoDB diretamente
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

// ✅ CORRETO - Service usa Repository
import * as customerRepository from '../repositories/customer.repository';
```

#### 5.3 Lógica de Negócio em Handlers
```typescript
// ❌ PROIBIDO - Handler com lógica de negócio
export async function handler(req) {
  const customer = await repo.getById(id);
  if (customer.balance < amount) throw new Error('...');
  // ... mais lógica
}

// ✅ CORRETO - Handler delega ao Service
export async function handler(req) {
  return customerService.withdraw(id, amount, userId);
}
```

#### 5.4 Ignorar Optimistic Locking
```typescript
// ❌ PROIBIDO - Update sem version check
await docClient.update({
  Key: { id },
  UpdateExpression: 'SET balance = :balance',
});

// ✅ CORRETO - Com version check
await docClient.update({
  Key: { id },
  ConditionExpression: 'version = :currentVersion',
  UpdateExpression: 'SET balance = :balance, version = version + 1',
});
```

#### 5.5 Esquecer de Buildar Shared
```bash
# ❌ PROIBIDO - Build direto do frontend/backend
cd packages/frontend-web && npm run build

# ✅ CORRETO - Build shared primeiro
cd packages/shared && npm run build
cd ../frontend-web && npm run build
```

#### 5.6 Usar Valores Mágicos para Stock
```typescript
// ❌ PROIBIDO
if (item.stock === -1) // infinito?
if (item.isInfinite) // campo extra desnecessário

// ✅ CORRETO
if (item.stock === 0) // stock=0 significa infinito
```

---

## 6. WORKFLOWS E PROCESSOS

### 6.1 Adicionar Nova Feature

1. **Tipos** - Adicione interfaces em `packages/shared/src/types/`
2. **Repository** - Implemente acesso a dados em `packages/backend/src/repositories/`
3. **Service** - Implemente lógica de negócio em `packages/backend/src/services/`
4. **Handler** - Exponha via API em `packages/backend/src/api/handlers/`
5. **API Client** - Adicione métodos em `packages/shared/src/api/services.ts`
6. **Componentes** - Implemente UI em `packages/frontend-web/src/components/`
7. **i18n** - Adicione traduções nos 3 arquivos de locale
8. **Testes** - Adicione testes unitários

### 6.2 Deploy

#### Beta (para testes)
```bash
# 1. Build shared
cd packages/shared && npm run build

# 2. Build e deploy frontend
cd ../frontend-web
VITE_SKIP_AUTH=true VITE_API_URL=https://cantina-beta.advm.lu npm run build
aws s3 sync dist/ s3://beta-cantina-frontend-625272706584 --delete --profile cantina
aws cloudfront create-invalidation --distribution-id E3RFATVK47GGJ7 --paths "/*" --profile cantina

# 3. Deploy backend (se necessário)
cd ../backend && npm run build:lambda
cd ../infra && npx cdk deploy --context subDomain=cantina-beta --profile cantina
```

#### Produção
```bash
# 1. Build shared
cd packages/shared && npm run build

# 2. Build e deploy frontend
cd ../frontend-web && npm run build
aws s3 sync dist/ s3://cantina-frontend-625272706584 --delete --profile cantina
aws cloudfront create-invalidation --distribution-id E7R30G3Z8J2DI --paths "/*" --profile cantina

# 3. Deploy backend (se necessário)
cd ../backend && npm run build:lambda
cd ../infra && npx cdk deploy --profile cantina
```

### 6.3 Adicionar Traduções

1. Adicione a chave nos 3 arquivos:
   - `packages/shared/src/i18n/locales/pt.json`
   - `packages/shared/src/i18n/locales/en.json`
   - `packages/shared/src/i18n/locales/fr.json`

2. Use no componente:
```typescript
import { useTranslation } from 'react-i18next';
const { t } = useTranslation();
// ...
<span>{t('namespace.key')}</span>
```

---

## 7. DEPENDÊNCIAS E INTEGRAÇÕES

### AWS Services
| Serviço | Uso |
|---------|-----|
| DynamoDB | 11 tabelas de dados |
| Lambda | API backend |
| API Gateway | Roteamento HTTP |
| CloudFront | CDN + routing |
| S3 | Hosting frontend |
| Secrets Manager | Credenciais Zoho OAuth |
| Route53 | DNS |
| ACM | Certificados SSL |
| CloudWatch | Métricas e alarmes |
| SNS | Notificações de alertas |

### Bibliotecas Críticas

**Backend**:
- `zod` - Validação de schemas
- `@aws-sdk/client-dynamodb` - Acesso DynamoDB
- `uuid` - Geração de IDs

**Frontend**:
- `react-i18next` - Internacionalização
- `i18next-browser-languagedetector` - Detecção de idioma

**Shared**:
- Nenhuma dependência externa (apenas tipos)

---

## 8. EXEMPLOS DE REFERÊNCIA

### 8.1 Novo Service

```typescript
// packages/backend/src/services/example.service.ts
import { Example, CreateExampleInput } from '@cantina-pos/shared';
import * as exampleRepository from '../repositories/example.repository';
import * as auditLogService from './audit-log.service';

export async function createExample(
  input: CreateExampleInput, 
  createdBy: string
): Promise<Example> {
  // 1. Validação de negócio
  if (!input.name?.trim()) {
    throw new Error('ERR_EMPTY_NAME');
  }

  // 2. Verificações de existência
  if (await exampleRepository.existsByName(input.name)) {
    throw new Error('ERR_DUPLICATE_NAME');
  }

  // 3. Criação
  const example = await exampleRepository.create(input);

  // 4. Audit log
  await auditLogService.logItemCreation(
    'example', 
    example.id, 
    createdBy, 
    JSON.stringify(input)
  );

  return example;
}

export async function getExample(id: string): Promise<Example> {
  const example = await exampleRepository.getById(id);
  if (!example) throw new Error('ERR_EXAMPLE_NOT_FOUND');
  return example;
}

export function resetService(): void {
  exampleRepository.resetRepository();
}
```

### 8.2 Novo Componente React

```typescript
// packages/frontend-web/src/components/example/ExampleCard.tsx
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Colors, Spacing, FontSizes, BorderRadius } from '@cantina-pos/shared';

interface ExampleCardProps {
  title: string;
  value: number;
  onPress: () => void;
}

export const ExampleCard: React.FC<ExampleCardProps> = ({ 
  title, 
  value, 
  onPress 
}) => {
  const { t } = useTranslation();

  return (
    <div
      onClick={onPress}
      style={{
        backgroundColor: Colors.background,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        cursor: 'pointer',
      }}
    >
      <h3 style={{ 
        fontSize: FontSizes.md, 
        color: Colors.text,
        margin: 0,
      }}>
        {title}
      </h3>
      <p style={{ 
        fontSize: FontSizes.lg, 
        color: Colors.primary,
        margin: `${Spacing.sm}px 0 0`,
      }}>
        {t('common.currency', { value })}
      </p>
    </div>
  );
};
```

### 8.3 Teste Unitário

```typescript
// packages/backend/src/services/__tests__/example.service.test.ts
import * as exampleService from '../example.service';
import * as auditLogRepository from '../../repositories/audit-log.repository';

describe('Example Service', () => {
  beforeEach(() => {
    exampleService.resetService();
    auditLogRepository.resetRepository();
  });

  describe('createExample', () => {
    it('should create example with valid input', async () => {
      const result = await exampleService.createExample(
        { name: 'Test' },
        'user1'
      );

      expect(result.id).toBeDefined();
      expect(result.name).toBe('Test');
    });

    it('should throw error for empty name', async () => {
      await expect(
        exampleService.createExample({ name: '' }, 'user1')
      ).rejects.toThrow('ERR_EMPTY_NAME');
    });

    it('should throw error for duplicate name', async () => {
      await exampleService.createExample({ name: 'Test' }, 'user1');
      
      await expect(
        exampleService.createExample({ name: 'Test' }, 'user1')
      ).rejects.toThrow('ERR_DUPLICATE_NAME');
    });
  });
});
```

---

## 9. HISTÓRICO DE MUDANÇAS

### Fevereiro 2026 - Monitoramento e Otimização
- Adicionado CloudWatch Alarms para Lambda, API Gateway e CloudFront
- Configurado SNS para notificações de erros por email
- Corrigido problema de N+1 queries no frontend (listagem de clientes)
- Removidas chamadas redundantes de `getCustomerBalance` no frontend

### Janeiro 2026 - i18n Completo
- Implementado suporte multi-idioma (PT/EN/FR)
- Migrados 30+ componentes para usar `react-i18next`
- Adicionado seletor de idioma com bandeiras

### Dezembro 2025 - Sistema de Crédito FIFO
- Implementado pagamento de dívidas com FIFO
- Adicionado campo `amountPaid` em transações
- Criado serviço de reconciliação

### Novembro 2025 - Pagamentos Mistos
- Refatorado `Sale.payments` de único para array
- Suporte a múltiplas formas de pagamento por venda

### Outubro 2025 - Catálogo Reutilizável
- Separado `CatalogItem` de `MenuItem`
- Catálogo compartilhado entre eventos

---

## 10. CASOS DE USO PRINCIPAIS

### 10.1 Realizar Venda

**Fluxo**:
1. Operador seleciona evento ativo
2. Adiciona itens do menu ao pedido
3. Sistema verifica estoque disponível
4. Operador seleciona forma(s) de pagamento
5. Se usar saldo/crédito, seleciona cliente
6. Confirma venda
7. Sistema atualiza estoque e gera recibo

**Regras de Negócio**:
- Soma dos pagamentos deve igualar total
- `balance` e `credit` requerem cliente
- `stock=0` permite vendas ilimitadas
- Estoque é decrementado atomicamente

**Componentes**: `SalesPage`, `OrderBuilder`, `PaymentModal`, `CustomerSelectModal`

### 10.2 Pagar Dívida de Cliente

**Fluxo**:
1. Operador busca cliente
2. Visualiza histórico e saldo devedor
3. Registra pagamento (cash/card/transfer)
4. Sistema aplica FIFO às compras pendentes
5. Atualiza `amountPaid` das transações

**Regras de Negócio**:
- Pagamento não pode exceder dívida total
- FIFO: compras mais antigas são pagas primeiro
- Transações parcialmente pagas são rastreadas

**Componentes**: `CustomerHistory`, `PaymentRegistrationModal`

### 10.3 Estornar Venda

**Fluxo**:
1. Operador acessa relatório de vendas
2. Seleciona venda a estornar
3. Informa motivo obrigatório
4. Sistema reverte estoque
5. Se tinha cliente, reverte transação

**Regras de Negócio**:
- Motivo é obrigatório
- Venda já estornada não pode ser estornada novamente
- Estoque é incrementado de volta
- Saldo do cliente é restaurado

**Componentes**: `EventReportView`, `ReceiptModal`

---

## Referências Rápidas

### IDs de Recursos AWS

| Recurso | Produção | Beta |
|---------|----------|------|
| CloudFront | E7R30G3Z8J2DI | E3RFATVK47GGJ7 |
| S3 Frontend | cantina-frontend-625272706584 | beta-cantina-frontend-625272706584 |
| Account | 625272706584 | 625272706584 |
| Region | eu-west-1 | eu-west-1 |
| Profile | cantina | cantina |

### Métodos de Pagamento

| Código | Nome PT | Descrição |
|--------|---------|-----------|
| `cash` | Dinheiro | Pagamento em espécie |
| `card` | Cartão | Débito/crédito |
| `transfer` | Transferência | Bancária |
| `balance` | Saldo | Usa saldo do cliente |
| `credit` | Fiado | Cria dívida |
| `gift` | Oferta | Cortesia |

### Códigos de Erro Comuns

| Código | Significado |
|--------|-------------|
| `ERR_CUSTOMER_NOT_FOUND` | Cliente não existe |
| `ERR_INSUFFICIENT_STOCK` | Estoque insuficiente |
| `ERR_PAYMENT_MISMATCH` | Soma pagamentos ≠ total |
| `ERR_ORDER_NOT_PENDING` | Pedido já confirmado/cancelado |
| `ERR_SALE_ALREADY_REFUNDED` | Venda já estornada |
| `ERR_CUSTOMER_REQUIRED` | Cliente obrigatório para balance/credit |

---

## 11. MONITORAMENTO E ALERTAS

### CloudWatch Alarms

| Alarm | Métrica | Threshold | Ação |
|-------|---------|-----------|------|
| `LambdaErrorsAlarm` | Lambda Errors | ≥1 em 5min | SNS → Email |
| `ApiGateway5xxAlarm` | API Gateway 5XXError | ≥1 em 5min | SNS → Email |
| `CloudFront5xxAlarm` | CloudFront 5xxErrorRate | >5% em 5min | SNS → Email |
| `LambdaThrottlesAlarm` | Lambda Throttles | ≥1 em 5min | SNS → Email |

### SNS Topic
- **Nome**: `cantina-alerts`
- **Subscribers**: fabricio.gouvea@gmail.com

### Verificar Status dos Alarms
```bash
aws cloudwatch describe-alarms --alarm-name-prefix "CantinaStack" \
  --profile cantina --region eu-west-1 \
  --query 'MetricAlarms[*].[AlarmName,StateValue]' --output table
```

### Verificar Logs de Erro
```bash
# Últimos erros do Lambda
aws logs filter-log-events \
  --log-group-name "/aws/lambda/cantina-api" \
  --start-time $(date -v-1H +%s000) \
  --filter-pattern "ERROR" \
  --profile cantina --region eu-west-1

# Verificar throttles
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda --metric-name Throttles \
  --dimensions Name=FunctionName,Value=cantina-api \
  --start-time $(date -u -v-24H +%Y-%m-%dT%H:%M:%SZ) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%SZ) \
  --period 3600 --statistics Sum \
  --profile cantina --region eu-west-1
```

---

## 12. OTIMIZAÇÕES FUTURAS

### 12.1 N+1 Queries no Backend (Prioridade Alta)

**Problema**: `getCustomersWithBalances()` faz 2 queries DynamoDB por cliente.

```typescript
// Atual - O(n) queries
async function getCustomersWithBalances() {
  const customers = await getAllCustomers(); // 1 query
  return Promise.all(customers.map(async c => ({
    ...c,
    balance: await calculateBalance(c.id), // 2 queries por cliente!
  })));
}
```

**Solução proposta**: Batch query para transações.
```typescript
// Otimizado - O(1) queries
async function getCustomersWithBalances() {
  const [customers, allTransactions] = await Promise.all([
    getAllCustomers(),
    getAllTransactions(), // Nova função com scan
  ]);
  const txByCustomer = groupBy(allTransactions, 'customerId');
  return customers.map(c => ({
    ...c,
    balance: calculateBalanceFromTxs(c, txByCustomer[c.id] || []),
  }));
}
```

### 12.2 Armazenar Saldo no Customer (Prioridade Média)

**Problema**: Saldo é recalculado somando todas as transações a cada request.

**Solução proposta**: Manter `balance` como campo no Customer e atualizar atomicamente.
```typescript
// Em cada transação, atualizar atomicamente:
await docClient.update({
  Key: { id: customerId },
  UpdateExpression: 'SET balance = balance + :delta, version = version + 1',
  ConditionExpression: 'version = :currentVersion',
  ExpressionAttributeValues: {
    ':delta': transactionAmount,
    ':currentVersion': customer.version,
  },
});
```

**Benefícios**:
- Leitura de saldo: O(1) em vez de O(n transações)
- Listagem de clientes: 1 query em vez de 1 + 2n

**Riscos**:
- Requer migração de dados
- Necessário reconciliação periódica para garantir consistência

### 12.3 Aumentar Quota de Concorrência Lambda (Prioridade Alta)

**Problema**: Limite atual de 10 concurrent executions causa throttling.

**Solução**: Solicitar aumento via Service Quotas.
```bash
aws service-quotas request-service-quota-increase \
  --service-code lambda \
  --quota-code L-B99A9384 \
  --desired-value 500 \
  --region eu-west-1 \
  --profile cantina
```

**Link**: https://eu-west-1.console.aws.amazon.com/servicequotas/home/services/lambda/quotas/L-B99A9384
