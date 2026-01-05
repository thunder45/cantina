# 002 - Remover creditLimit

## Resumo

| Campo | Valor |
|-------|-------|
| Prioridade | 🟡 Média |
| Esforço | Baixo (1-2 horas) |
| Risco | Baixo |
| Status | ✅ Implementado |

Remover completamente o campo `creditLimit` que não é mais utilizado.

## Problema Atual

O campo `creditLimit` existe no modelo mas o enforcement foi removido:

```typescript
// Customer type ainda tem o campo
interface Customer {
  creditLimit: number;  // ← Não usado
  // ...
}

// createCustomer ainda aceita o parâmetro
export async function createCustomer(
  name: string, 
  creditLimit: number = DEFAULT_CREDIT_LIMIT,  // ← Não usado
  initialBalance: number = 0
)
```

**Problemas**:
- Código morto confunde desenvolvedores
- `DEFAULT_CREDIT_LIMIT = 100` ainda existe
- UI mostrava "Limite de crédito: €100" (já removido)

## Solução Proposta

Remover `creditLimit` de:
1. Tipos TypeScript
2. Services e Repositories
3. Handlers
4. Dados existentes no DynamoDB (opcional)

## Arquivos Afetados

| Arquivo | Mudança |
|---------|---------|
| `packages/shared/src/types/customer.ts` | Remover campo e constante |
| `packages/backend/src/repositories/customer.repository.ts` | Remover parâmetro |
| `packages/backend/src/services/customer.service.ts` | Remover parâmetro e funções |
| `packages/backend/src/api/handlers/customers.handler.ts` | Remover endpoint e tipos |
| `packages/backend/src/api/router.ts` | Remover rota |

## Passo a Passo

### 1. Atualizar tipos (shared)

```typescript
// packages/shared/src/types/customer.ts

// REMOVER:
// export const DEFAULT_CREDIT_LIMIT = 100;

export interface Customer {
  id: string;
  name: string;
  // REMOVER: creditLimit: number;
  initialBalance: number;
  createdAt: string;
  deletedAt?: string;
  version: number;
}

export interface CreateCustomerInput {
  name: string;
  // REMOVER: creditLimit?: number;
  initialBalance?: number;
}
```

### 2. Atualizar repository

```typescript
// packages/backend/src/repositories/customer.repository.ts

// ANTES:
export async function createCustomer(
  name: string, 
  creditLimit: number = DEFAULT_CREDIT_LIMIT, 
  initialBalance: number = 0
)

// DEPOIS:
export async function createCustomer(
  name: string, 
  initialBalance: number = 0
)
```

### 3. Atualizar service

```typescript
// packages/backend/src/services/customer.service.ts

// REMOVER função:
// export async function updateCreditLimit(...)

// REMOVER função:
// export async function canPurchase(...)

// Atualizar createCustomer:
export async function createCustomer(
  name: string, 
  initialBalance: number = 0
): Promise<Customer> {
  if (!name?.trim()) throw new Error('ERR_EMPTY_NAME');
  return customerRepository.createCustomer(name.trim(), initialBalance);
}
```

### 4. Atualizar handler

```typescript
// packages/backend/src/api/handlers/customers.handler.ts

// REMOVER interface:
// interface UpdateCreditLimitBody { creditLimit: number; }

// REMOVER do handler:
// if (httpMethod === 'PATCH' && customerId && path.includes('/credit-limit')) {
//   return await updateCreditLimit(customerId, event);
// }

// REMOVER função:
// async function updateCreditLimit(...)

// Atualizar CreateCustomerBody:
interface CreateCustomerBody {
  name: string;
  // REMOVER: creditLimit?: number;
  initialBalance?: number;
}
```

### 5. Atualizar router

```typescript
// packages/backend/src/api/router.ts

// REMOVER:
// { pattern: '/customers/{id}/credit-limit', handler: 'customers' },
```

### 6. Build e testar

```bash
npm run build --workspace=@cantina-pos/shared
npm run build:lambda --workspace=@cantina-pos/backend
cd packages/frontend-web && npx tsc --noEmit

# Deploy beta e testar criação de cliente
```

### 7. (Opcional) Limpar dados existentes

```bash
# Listar clientes com creditLimit
aws dynamodb scan --table-name cantina-customers \
  --filter-expression "attribute_exists(creditLimit)" \
  --projection-expression "id,creditLimit" \
  --profile cantina

# Remover campo (se necessário)
# Não é obrigatório - DynamoDB ignora campos extras
```

## Riscos e Mitigações

| Risco | Probabilidade | Mitigação |
|-------|---------------|-----------|
| Quebrar código que usa creditLimit | Baixa | TypeScript vai apontar erros |
| Dados antigos com campo | Nenhum | DynamoDB ignora campos extras |

## Critérios de Sucesso

- [x] Build compila sem erros
- [x] Criar cliente funciona sem creditLimit
- [x] Nenhuma referência a creditLimit no código
- [x] Testes passam (217 testes)

## Lições Aprendidas

- Remoção de código morto é simples quando TypeScript aponta todos os usos
- Testes precisam ser atualizados junto com o código

---

*Criado: 2026-01-05*
*Última atualização: 2026-01-05*
*Implementado: 2026-01-05*
