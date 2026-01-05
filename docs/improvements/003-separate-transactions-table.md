# 003 - Separar Tabela de Transactions

## Resumo

| Campo | Valor |
|-------|-------|
| Prioridade | 🟡 Média |
| Esforço | Médio (1-2 dias) |
| Risco | Médio |
| Status | Pendente |
| Pré-requisito | #1 (Transações Atômicas) |

Separar `CustomerTransaction` em tabela própria para queries mais eficientes.

## Problema Atual

A tabela `cantina-customers` armazena dois tipos de registros:

```
cantina-customers
├── { id: "abc-123", name: "João", ... }           ← Customer
├── { id: "tx#def-456", customerId: "abc-123" }    ← Transaction
├── { id: "tx#ghi-789", customerId: "abc-123" }    ← Transaction
└── { id: "xyz-999", name: "Maria", ... }          ← Customer
```

**Problemas**:
1. **Query ineficiente**: Para buscar transações de um cliente, usamos `FilterExpression` (scan) em vez de `Query`
2. **Diferenciação por prefixo**: Código verifica `id.startsWith('tx#')` para diferenciar tipos
3. **Sem índice por data**: Não há como buscar transações por período eficientemente

## Solução Proposta

Criar tabela separada `cantina-customer-transactions`:

```
cantina-customers                    cantina-customer-transactions
├── id (PK)                          ├── customerId (PK)
├── name                             ├── id (SK)
├── initialBalance                   ├── type
├── ...                              ├── amount
                                     ├── amountPaid
                                     ├── saleId
                                     ├── createdAt
                                     ├── ...
```

**Benefícios**:
- Query por `customerId` retorna apenas transações
- Sort key permite ordenação por `id` ou `createdAt`
- GSI possível para queries por `saleId`

## Arquivos Afetados

| Arquivo | Mudança |
|---------|---------|
| `packages/infra/src/cantina-stack.ts` | Adicionar nova tabela |
| `packages/backend/src/repositories/customer.repository.ts` | Separar operações |
| `packages/backend/src/services/customer.service.ts` | Atualizar imports |
| Lambda environment | Adicionar `CUSTOMER_TRANSACTIONS_TABLE` |

## Modelo de Dados Proposto

### Tabela: cantina-customer-transactions

| Atributo | Tipo | Descrição |
|----------|------|-----------|
| customerId | String (PK) | ID do cliente |
| id | String (SK) | ID da transação (sem prefixo tx#) |
| type | String | deposit, withdrawal, purchase, refund |
| amount | Number | Valor (sempre positivo) |
| amountPaid | Number | Quanto já foi pago (FIFO) |
| saleId | String | FK para Sale (purchases/refunds) |
| paymentMethod | String | cash, card, pix |
| description | String | Descrição |
| createdBy | String | Quem criou |
| createdAt | String | ISO timestamp |

### GSI: saleId-index (opcional)

| Atributo | Tipo |
|----------|------|
| saleId (PK) | String |
| id (SK) | String |

Permite buscar transação por saleId (útil para refunds).

## Passo a Passo

### 1. Criar tabela no CDK

```typescript
// packages/infra/src/cantina-stack.ts

const customerTransactionsTable = new dynamodb.Table(this, 'CustomerTransactionsTable', {
  tableName: `${envPrefix}cantina-customer-transactions`,
  partitionKey: { name: 'customerId', type: dynamodb.AttributeType.STRING },
  sortKey: { name: 'id', type: dynamodb.AttributeType.STRING },
  billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
  removalPolicy: cdk.RemovalPolicy.RETAIN,
});

// GSI opcional para busca por saleId
customerTransactionsTable.addGlobalSecondaryIndex({
  indexName: 'saleId-index',
  partitionKey: { name: 'saleId', type: dynamodb.AttributeType.STRING },
});

// Dar permissão à Lambda
customerTransactionsTable.grantReadWriteData(backendLambda);

// Passar variável de ambiente
backendLambda.addEnvironment('CUSTOMER_TRANSACTIONS_TABLE', customerTransactionsTable.tableName);
```

### 2. Criar novo repository

```typescript
// packages/backend/src/repositories/customer-transaction.repository.ts

import { CustomerTransaction, CreateTransactionInput } from '@cantina-pos/shared';
import { v4 as uuidv4 } from 'uuid';
import { DynamoDBDocumentClient, PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const TABLE_NAME = process.env.CUSTOMER_TRANSACTIONS_TABLE;

export async function createTransaction(
  customerId: string, 
  input: CreateTransactionInput
): Promise<CustomerTransaction> {
  const tx: CustomerTransaction = {
    id: uuidv4(),  // Sem prefixo tx#
    customerId,
    type: input.type,
    amount: input.amount,
    amountPaid: input.paidAmount || (input.type === 'deposit' ? input.amount : 0),
    saleId: input.saleId,
    paymentMethod: input.paymentMethod,
    description: input.description,
    createdBy: input.createdBy,
    createdAt: new Date().toISOString(),
  };

  if (isProduction) {
    await docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: tx }));
  } else {
    transactions.set(tx.id, tx);
  }
  return tx;
}

export async function getTransactionsByCustomer(customerId: string): Promise<CustomerTransaction[]> {
  if (isProduction) {
    const result = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'customerId = :cid',
      ExpressionAttributeValues: { ':cid': customerId },
      ScanIndexForward: false,  // Mais recentes primeiro
    }));
    return (result.Items || []) as CustomerTransaction[];
  }
  return Array.from(transactions.values())
    .filter(tx => tx.customerId === customerId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getUnpaidPurchases(customerId: string): Promise<CustomerTransaction[]> {
  const txs = await getTransactionsByCustomer(customerId);
  return txs
    .filter(tx => tx.type === 'purchase' && tx.amountPaid < tx.amount)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));  // FIFO: mais antigas primeiro
}

export async function updateAmountPaid(
  customerId: string, 
  txId: string, 
  amountPaid: number
): Promise<void> {
  if (isProduction) {
    await docClient.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { customerId, id: txId },
      UpdateExpression: 'SET amountPaid = :ap',
      ExpressionAttributeValues: { ':ap': amountPaid },
    }));
  } else {
    const tx = transactions.get(txId);
    if (tx) tx.amountPaid = amountPaid;
  }
}
```

### 3. Migrar dados existentes

```bash
# Script de migração
aws dynamodb scan --table-name cantina-customers \
  --filter-expression "begins_with(id, :prefix)" \
  --expression-attribute-values '{":prefix":{"S":"tx#"}}' \
  --profile cantina > transactions-backup.json

# Para cada transação, inserir na nova tabela:
# - Remover prefixo tx# do id
# - Usar customerId como PK
```

### 4. Atualizar customer.repository.ts

Remover funções de transação, manter apenas funções de Customer.

### 5. Atualizar customer.service.ts

```typescript
import * as customerRepository from '../repositories/customer.repository';
import * as transactionRepository from '../repositories/customer-transaction.repository';

// Substituir chamadas:
// customerRepository.createTransaction → transactionRepository.createTransaction
// customerRepository.getTransactionsByCustomer → transactionRepository.getTransactionsByCustomer
```

### 6. Deploy e testar

```bash
# 1. Deploy CDK (cria tabela)
cd packages/infra && npx cdk deploy CantinaBetaStack ...

# 2. Migrar dados (beta)
node scripts/migrate-transactions.js --env beta

# 3. Deploy Lambda
npm run build:lambda && cdk deploy ...

# 4. Testar
# - Criar cliente
# - Fazer depósito
# - Fazer compra
# - Verificar histórico
```

## Riscos e Mitigações

| Risco | Probabilidade | Mitigação |
|-------|---------------|-----------|
| Perda de dados na migração | Média | Backup antes, migração em beta primeiro |
| Inconsistência durante migração | Média | Fazer em horário de baixo uso |
| Código antigo acessando tabela errada | Baixa | TypeScript vai apontar erros |

## Critérios de Sucesso

- [ ] Nova tabela criada com PK/SK corretos
- [ ] Dados migrados sem perda
- [ ] Query por customerId usa KeyConditionExpression (não FilterExpression)
- [ ] FIFO continua funcionando
- [ ] Performance de histórico melhorada

## Checklist de Implementação

- [ ] Criar tabela no CDK
- [ ] Criar `customer-transaction.repository.ts`
- [ ] Criar script de migração
- [ ] Testar migração em beta
- [ ] Atualizar `customer.repository.ts`
- [ ] Atualizar `customer.service.ts`
- [ ] Atualizar testes
- [ ] Deploy beta
- [ ] Migrar dados beta
- [ ] Testar funcionalidades
- [ ] Deploy produção
- [ ] Migrar dados produção
- [ ] Remover dados antigos (após validação)
- [ ] Atualizar CONTEXT.md
- [ ] Atualizar status neste documento

## Lições Aprendidas

*(Preencher após implementação)*

---

*Criado: 2026-01-05*
*Última atualização: 2026-01-05*
