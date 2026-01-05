# 005 - Validação com Zod

## Resumo

| Campo | Valor |
|-------|-------|
| Prioridade | 🟢 Baixa |
| Esforço | Médio (1-2 dias) |
| Risco | Baixo |
| Status | Pendente |

Usar Zod para validação declarativa de inputs em vez de validação manual.

## Problema Atual

Validação manual em cada handler:

```typescript
// customers.handler.ts
const body = parseBody<CreateCustomerBody>(event.body);
if (!body) return error('ERR_INVALID_BODY', 'Corpo inválido', 400);

const nameError = validateName(body.name, 'name');
if (nameError) return error('ERR_VALIDATION', nameError.message, 400);

// Tipo não é garantido em runtime
interface CreateCustomerBody {
  name: string;
  initialBalance?: number;
}
```

**Problemas**:
- Validação repetitiva em cada handler
- Tipos TypeScript não garantem runtime
- Fácil esquecer validações
- Mensagens de erro inconsistentes

## Solução Proposta

Usar Zod para schemas declarativos:

```typescript
import { z } from 'zod';

const CreateCustomerSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100, 'Nome muito longo'),
  initialBalance: z.number().optional().default(0),
});

type CreateCustomerInput = z.infer<typeof CreateCustomerSchema>;

// No handler
const result = CreateCustomerSchema.safeParse(JSON.parse(event.body));
if (!result.success) {
  return error('ERR_VALIDATION', result.error.issues[0].message, 400);
}
const body = result.data;  // Tipo garantido
```

## Arquivos Afetados

| Arquivo | Mudança |
|---------|---------|
| `packages/backend/package.json` | Adicionar zod |
| `packages/shared/src/schemas/` | Criar schemas |
| `packages/backend/src/api/handlers/*.ts` | Usar schemas |
| `packages/backend/src/api/validation.ts` | Refatorar helpers |

## Passo a Passo

### 1. Instalar Zod

```bash
cd packages/backend
npm install zod
```

### 2. Criar schemas no shared

```typescript
// packages/shared/src/schemas/customer.schema.ts
import { z } from 'zod';

export const CreateCustomerSchema = z.object({
  name: z.string()
    .min(1, 'Nome é obrigatório')
    .max(100, 'Nome deve ter no máximo 100 caracteres')
    .transform(s => s.trim()),
  initialBalance: z.number().optional().default(0),
});

export const TransactionSchema = z.object({
  amount: z.number()
    .positive('Valor deve ser positivo'),
  paymentMethod: z.enum(['cash', 'card', 'pix', 'balance', 'credit']),
  description: z.string().optional(),
});

export const UpdateCustomerSchema = z.object({
  name: z.string().min(1).max(100).transform(s => s.trim()).optional(),
  initialBalance: z.number().optional(),
}).refine(data => data.name || data.initialBalance !== undefined, {
  message: 'Pelo menos um campo deve ser fornecido',
});

export type CreateCustomerInput = z.infer<typeof CreateCustomerSchema>;
export type TransactionInput = z.infer<typeof TransactionSchema>;
export type UpdateCustomerInput = z.infer<typeof UpdateCustomerSchema>;
```

### 3. Criar helper de validação

```typescript
// packages/backend/src/api/validation.ts
import { z, ZodSchema } from 'zod';
import { error } from './response';
import { APIGatewayResponse } from './types';

export function validateBody<T>(
  body: string | null,
  schema: ZodSchema<T>
): { success: true; data: T } | { success: false; response: APIGatewayResponse } {
  if (!body) {
    return { 
      success: false, 
      response: error('ERR_INVALID_BODY', 'Corpo da requisição é obrigatório', 400) 
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return { 
      success: false, 
      response: error('ERR_INVALID_JSON', 'JSON inválido', 400) 
    };
  }

  const result = schema.safeParse(parsed);
  if (!result.success) {
    const message = result.error.issues[0].message;
    return { 
      success: false, 
      response: error('ERR_VALIDATION', message, 400) 
    };
  }

  return { success: true, data: result.data };
}
```

### 4. Atualizar handlers

```typescript
// packages/backend/src/api/handlers/customers.handler.ts
import { CreateCustomerSchema, TransactionSchema, UpdateCustomerSchema } from '@cantina-pos/shared';
import { validateBody } from '../validation';

async function createCustomer(event: APIGatewayEvent): Promise<APIGatewayResponse> {
  const validation = validateBody(event.body, CreateCustomerSchema);
  if (!validation.success) return validation.response;
  
  const { name, initialBalance } = validation.data;
  const customer = await customerService.createCustomer(name, initialBalance);
  return created(customer);
}

async function deposit(
  customerId: string, 
  event: APIGatewayEvent, 
  createdBy: string
): Promise<APIGatewayResponse> {
  const validation = validateBody(event.body, TransactionSchema);
  if (!validation.success) return validation.response;
  
  const { amount, paymentMethod, description } = validation.data;
  const tx = await customerService.deposit(customerId, amount, paymentMethod, createdBy, description);
  return success(tx);
}
```

### 5. Criar schemas para outros domínios

```typescript
// packages/shared/src/schemas/event.schema.ts
export const CreateEventSchema = z.object({
  name: z.string().min(1).max(100),
  categoryId: z.string().uuid(),
  dates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).min(1),
});

// packages/shared/src/schemas/sale.schema.ts
export const CreateSaleSchema = z.object({
  orderId: z.string().uuid(),
  payments: z.array(z.object({
    method: z.enum(['cash', 'card', 'pix', 'balance', 'credit']),
    amount: z.number().positive(),
  })).min(1),
  customerId: z.string().uuid().optional(),
});
```

### 6. Exportar schemas

```typescript
// packages/shared/src/schemas/index.ts
export * from './customer.schema';
export * from './event.schema';
export * from './sale.schema';

// packages/shared/src/index.ts
export * from './schemas';
```

## Riscos e Mitigações

| Risco | Probabilidade | Mitigação |
|-------|---------------|-----------|
| Zod aumenta bundle size | Baixa | ~50KB, aceitável |
| Mensagens de erro em inglês | Média | Customizar mensagens |
| Refactor extenso | Média | Fazer por domínio |

## Critérios de Sucesso

- [ ] Todos os handlers usam Zod
- [ ] Tipos inferidos automaticamente
- [ ] Mensagens de erro consistentes
- [ ] Validação de campos obrigatórios
- [ ] Transformações (trim) aplicadas

## Checklist de Implementação

- [ ] Instalar zod no backend
- [ ] Criar schemas em shared
- [ ] Criar helper validateBody
- [ ] Migrar customers.handler.ts
- [ ] Migrar events.handler.ts
- [ ] Migrar sales.handler.ts
- [ ] Migrar reports.handler.ts
- [ ] Remover validação manual antiga
- [ ] Atualizar testes
- [ ] Deploy beta
- [ ] Testar validações
- [ ] Deploy produção
- [ ] Atualizar status neste documento

## Lições Aprendidas

*(Preencher após implementação)*

---

*Criado: 2026-01-05*
*Última atualização: 2026-01-05*
