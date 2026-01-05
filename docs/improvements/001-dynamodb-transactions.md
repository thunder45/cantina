# 001 - Transações DynamoDB Atômicas

## Resumo

| Campo | Valor |
|-------|-------|
| Prioridade | 🔴 Alta |
| Esforço | Baixo (2-4 horas) |
| Risco | Baixo |
| Status | ✅ Implementado |

Usar `TransactWriteCommand` do DynamoDB para garantir atomicidade em operações que modificam múltiplas tabelas.

## Decisão de Implementação

Após análise do limite de 25 items do TransactWriteCommand:

| Operação | Items | Estratégia |
|----------|-------|------------|
| `recordPurchase` | 2 max | TransactWriteCommand ✅ |
| `deposit` / `applyPaymentFIFO` | 2-40+ | Batches de 20 items (10 purchases) |
| `recalculateFIFO` | 24+ | Operações separadas (manter atual) |

**Mitigações para operações não-atômicas:**
1. Log/alerta em caso de falha de qualquer operação
2. Job de reconciliação semanal
3. Reconciliação automática quando houver falha

## Problema Atual

Quando um cliente faz uma compra a crédito com saldo positivo, duas operações acontecem:

```typescript
// customer.service.ts - recordPurchase()
const tx = await customerRepository.createTransaction(...);  // 1. Cria transação
await syncSalePayments(saleId, effectivePaidAmount);         // 2. Atualiza Sale.payments
```

**Problema**: Se a operação 2 falhar, a transação foi criada mas `Sale.payments` não foi atualizado.

**Caso real**: Compra de €100 do Fabricio - transação não foi criada porque `syncSalePayments` falhou antes.

## Solução Proposta

Usar `TransactWriteCommand` para executar ambas operações atomicamente:

```typescript
import { TransactWriteCommand } from '@aws-sdk/lib-dynamodb';

await docClient.send(new TransactWriteCommand({
  TransactItems: [
    { 
      Put: { 
        TableName: CUSTOMERS_TABLE, 
        Item: transaction 
      } 
    },
    { 
      Update: { 
        TableName: SALES_TABLE, 
        Key: { id: saleId },
        UpdateExpression: 'SET payments = :p',
        ExpressionAttributeValues: { ':p': newPayments }
      }
    }
  ]
}));
```

**Garantia**: Ou ambas operações acontecem, ou nenhuma.

## Arquivos Afetados

| Arquivo | Mudança |
|---------|---------|
| `packages/backend/src/services/customer.service.ts` | Refatorar `recordPurchase()` |
| `packages/backend/src/services/customer.service.ts` | Refatorar `applyPaymentFIFO()` |
| `packages/backend/src/repositories/customer.repository.ts` | Adicionar função para transação atômica |

## Passo a Passo

### 1. Criar helper para transações atômicas

```typescript
// packages/backend/src/repositories/dynamodb-transactions.ts

import { DynamoDBDocumentClient, TransactWriteCommand, TransactWriteCommandInput } from '@aws-sdk/lib-dynamodb';

export async function executeTransaction(
  docClient: DynamoDBDocumentClient,
  items: TransactWriteCommandInput['TransactItems']
): Promise<void> {
  await docClient.send(new TransactWriteCommand({ TransactItems: items }));
}
```

### 2. Refatorar recordPurchase

```typescript
// customer.service.ts

export async function recordPurchase(
  customerId: string,
  amount: number,
  saleId: string,
  createdBy: string,
  paidAmount: number = 0
): Promise<CustomerTransaction> {
  const customer = await getCustomer(customerId);
  
  // Calcular effectivePaidAmount
  let effectivePaidAmount = paidAmount;
  if (paidAmount === 0) {
    const balance = await customerRepository.calculateBalance(customerId);
    if (balance > 0) {
      effectivePaidAmount = Math.min(balance, amount);
    }
  }

  // Preparar transação
  const transaction: CustomerTransaction = {
    id: `tx#${uuidv4()}`,
    customerId,
    type: 'purchase',
    amount,
    amountPaid: effectivePaidAmount,
    saleId,
    createdBy,
    description: 'Compra',
    createdAt: new Date().toISOString(),
  };

  // Preparar atualização de Sale.payments (se necessário)
  const saleUpdate = effectivePaidAmount > 0 && paidAmount === 0
    ? await buildSalePaymentsUpdate(saleId, effectivePaidAmount)
    : null;

  // Executar atomicamente
  if (isProduction) {
    const transactItems = [
      { Put: { TableName: CUSTOMERS_TABLE, Item: transaction } }
    ];
    
    if (saleUpdate) {
      transactItems.push({
        Update: {
          TableName: SALES_TABLE,
          Key: { id: saleId },
          UpdateExpression: 'SET payments = :p',
          ExpressionAttributeValues: { ':p': saleUpdate.newPayments }
        }
      });
    }
    
    await executeTransaction(docClient, transactItems);
  } else {
    // Dev mode: operações separadas (Map não suporta transactions)
    transactions.set(transaction.id, transaction);
    if (saleUpdate) {
      await syncSalePayments(saleId, effectivePaidAmount);
    }
  }

  return transaction;
}
```

### 3. Refatorar applyPaymentFIFO

Similar ao acima - agrupar updates de múltiplas transações + Sale em uma única TransactWriteCommand.

### 4. Testar

```bash
# 1. Deploy para beta
npm run build:lambda --workspace=@cantina-pos/backend
cd packages/infra && npx cdk deploy CantinaBetaStack ...

# 2. Testar cenário:
#    - Cliente com saldo positivo
#    - Fazer compra a crédito
#    - Verificar que transação E Sale.payments foram atualizados

# 3. Testar falha simulada (opcional):
#    - Adicionar throw antes do TransactWriteCommand
#    - Verificar que nenhuma operação foi persistida
```

## Riscos e Mitigações

| Risco | Probabilidade | Mitigação |
|-------|---------------|-----------|
| TransactWriteCommand tem limite de 25 items | Baixa | FIFO raramente atualiza >25 compras |
| Custo maior (2x WCU por item) | Baixa | Volume baixo, custo negligenciável |
| Dev mode não testa atomicidade | Média | Testar sempre em beta antes de prod |

## Critérios de Sucesso

- [x] Compra a crédito com saldo positivo cria transação E atualiza Sale.payments
- [x] applyPaymentFIFO processa em batches de 20 items
- [x] Log de erro quando batch falha
- [x] Reconciliação automática em caso de falha
- [ ] Job de reconciliação semanal (pendente: configurar EventBridge)
- [x] Testes locais continuam funcionando (dev mode)

## Arquivos Criados/Modificados

| Arquivo | Mudança |
|---------|---------|
| `src/repositories/dynamodb-transactions.ts` | Helper para TransactWriteCommand |
| `src/services/reconciliation.service.ts` | Serviço de reconciliação FIFO |
| `src/services/customer.service.ts` | applyPaymentFIFO com batches |

## Lições Aprendidas

- TransactWriteCommand tem limite de 25 items - operações FIFO grandes precisam de batches
- Reconciliação é essencial como safety net para operações não-atômicas
- Batches de 20 (não 25) dão margem de segurança

---

*Criado: 2026-01-05*
*Última atualização: 2026-01-05*
