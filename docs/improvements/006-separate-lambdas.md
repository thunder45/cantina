# 006 - Separar Lambdas por Domínio

## Resumo

| Campo | Valor |
|-------|-------|
| Prioridade | 🟢 Baixa |
| Esforço | Médio (2-3 dias) |
| Risco | Médio |
| Status | Futuro |

Separar a Lambda monolítica em múltiplas Lambdas por domínio.

## Problema Atual

Uma única Lambda com router interno:

```
BackendLambda
├── /customers/* → customers.handler
├── /sales/*     → sales.handler
├── /events/*    → events.handler
├── /reports/*   → reports.handler
├── /orders/*    → orders.handler
├── /menu/*      → menu.handler
└── /catalog/*   → catalog.handler
```

**Problemas**:
- Cold start carrega todo o código (~300KB)
- Todas as permissões em uma Lambda
- Scaling é tudo ou nada
- Deploy atualiza tudo mesmo para mudança pequena

## Solução Proposta

Separar em Lambdas por domínio:

```
Lambda-Customers  → /customers/*
Lambda-Sales      → /sales/*, /orders/*
Lambda-Events     → /events/*, /menu/*, /catalog/*
Lambda-Reports    → /reports/*
```

**Benefícios**:
- Cold start mais rápido (~50-100KB cada)
- Permissões granulares (cada Lambda acessa só suas tabelas)
- Scaling independente
- Deploy parcial

## Arquivos Afetados

| Arquivo | Mudança |
|---------|---------|
| `packages/infra/src/cantina-stack.ts` | Criar múltiplas Lambdas |
| `packages/backend/src/lambda-*.ts` | Entry points separados |
| `packages/backend/scripts/bundle-lambda.js` | Gerar múltiplos bundles |

## Estrutura Proposta

```
packages/backend/
├── src/
│   ├── lambda-customers.ts    # Entry point customers
│   ├── lambda-sales.ts        # Entry point sales + orders
│   ├── lambda-events.ts       # Entry point events + menu + catalog
│   ├── lambda-reports.ts      # Entry point reports
│   ├── api/
│   │   ├── handlers/
│   │   └── ...
│   ├── services/
│   └── repositories/
└── dist/
    └── lambda/
        ├── customers/index.js
        ├── sales/index.js
        ├── events/index.js
        └── reports/index.js
```

## Passo a Passo

### 1. Criar entry points

```typescript
// packages/backend/src/lambda-customers.ts
import { handler as customersHandler } from './api/handlers/customers.handler';

export const handler = customersHandler;
```

```typescript
// packages/backend/src/lambda-sales.ts
import { APIGatewayEvent, APIGatewayProxyResult } from 'aws-lambda';
import { handler as salesHandler } from './api/handlers/sales.handler';
import { handler as ordersHandler } from './api/handlers/orders.handler';

export async function handler(event: APIGatewayEvent): Promise<APIGatewayProxyResult> {
  const path = event.path;
  
  if (path.startsWith('/orders')) {
    return ordersHandler(event);
  }
  return salesHandler(event);
}
```

### 2. Atualizar bundle script

```javascript
// packages/backend/scripts/bundle-lambda.js
const lambdas = [
  { name: 'customers', entry: 'lambda-customers.ts' },
  { name: 'sales', entry: 'lambda-sales.ts' },
  { name: 'events', entry: 'lambda-events.ts' },
  { name: 'reports', entry: 'lambda-reports.ts' },
];

for (const lambda of lambdas) {
  await esbuild.build({
    entryPoints: [`src/${lambda.entry}`],
    bundle: true,
    outfile: `dist/lambda/${lambda.name}/index.js`,
    platform: 'node',
    target: 'node18',
    external: ['@aws-sdk/*'],
  });
}
```

### 3. Atualizar CDK

```typescript
// packages/infra/src/cantina-stack.ts

const customersLambda = new lambda.Function(this, 'CustomersLambda', {
  runtime: lambda.Runtime.NODEJS_18_X,
  handler: 'index.handler',
  code: lambda.Code.fromAsset(path.join(__dirname, '../../backend/dist/lambda/customers')),
  environment: {
    CUSTOMERS_TABLE: customersTable.tableName,
  },
});
customersTable.grantReadWriteData(customersLambda);

const salesLambda = new lambda.Function(this, 'SalesLambda', {
  runtime: lambda.Runtime.NODEJS_18_X,
  handler: 'index.handler',
  code: lambda.Code.fromAsset(path.join(__dirname, '../../backend/dist/lambda/sales')),
  environment: {
    SALES_TABLE: salesTable.tableName,
    ORDERS_TABLE: ordersTable.tableName,
    CUSTOMERS_TABLE: customersTable.tableName,  // Para fiado
    MENU_ITEMS_TABLE: menuItemsTable.tableName, // Para estoque
  },
});
salesTable.grantReadWriteData(salesLambda);
ordersTable.grantReadWriteData(salesLambda);
// ...

// API Gateway com múltiplas integrações
const api = new apigateway.RestApi(this, 'CantinaApi', { ... });

const customers = api.root.addResource('customers');
customers.addMethod('ANY', new apigateway.LambdaIntegration(customersLambda));
customers.addResource('{id}').addMethod('ANY', new apigateway.LambdaIntegration(customersLambda));

const sales = api.root.addResource('sales');
sales.addMethod('ANY', new apigateway.LambdaIntegration(salesLambda));
// ...
```

## Riscos e Mitigações

| Risco | Probabilidade | Mitigação |
|-------|---------------|-----------|
| Complexidade de deploy | Média | Scripts automatizados |
| Dependências circulares | Média | Shared services em layer |
| Custo maior (mais Lambdas) | Baixa | Pay per use, volume baixo |

## Critérios de Sucesso

- [ ] Cada Lambda < 100KB
- [ ] Cold start < 500ms
- [ ] Permissões mínimas por Lambda
- [ ] Deploy independente funciona
- [ ] Todas as rotas funcionam

## Quando Implementar

Esta melhoria é para **futuro**, quando:
- Cold start se tornar problema perceptível
- Volume de requests aumentar significativamente
- Necessidade de permissões mais granulares

**Não implementar agora** porque:
- Sistema funciona bem com Lambda única
- Complexidade adicional não justificada
- Volume atual é baixo

## Checklist de Implementação

*(Para quando for implementar)*

- [ ] Criar entry points separados
- [ ] Atualizar bundle script
- [ ] Atualizar CDK
- [ ] Testar cada Lambda isoladamente
- [ ] Testar integração completa
- [ ] Medir cold start antes/depois
- [ ] Deploy beta
- [ ] Deploy produção
- [ ] Atualizar status neste documento

## Lições Aprendidas

*(Preencher após implementação)*

---

*Criado: 2026-01-05*
*Última atualização: 2026-01-05*
