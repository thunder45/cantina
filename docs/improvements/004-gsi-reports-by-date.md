# 004 - GSI para Relatórios por Data

## Resumo

| Campo | Valor |
|-------|-------|
| Prioridade | 🟡 Média |
| Esforço | Baixo (2-4 horas) |
| Risco | Baixo |
| Status | ✅ Concluído |

Adicionar GSI na tabela de vendas para queries eficientes por período.

## Problema Atual

Relatórios globais fazem Scan completo e filtram em memória:

```typescript
// report.repository.ts
const result = await docClient.send(new ScanCommand({ TableName: SALES_TABLE }));
const sales = result.Items as Sale[];

// Filtro em memória
if (filter.startDate) {
  sales = sales.filter(s => new Date(s.createdAt) >= new Date(filter.startDate));
}
```

**Problemas**:
- Scan lê TODOS os registros (custo alto)
- Filtro em memória é lento para muitos registros
- Não escala bem

## Solução Proposta

Criar GSI com partição por mês e sort por timestamp:

```
GSI: month-createdAt-index
├── PK: yearMonth (YYYY-MM)
├── SK: createdAt (ISO timestamp)
```

**Query eficiente**:
```typescript
// Buscar vendas de Janeiro 2026
await docClient.send(new QueryCommand({
  TableName: SALES_TABLE,
  IndexName: 'month-createdAt-index',
  KeyConditionExpression: 'yearMonth = :ym AND createdAt BETWEEN :start AND :end',
  ExpressionAttributeValues: {
    ':ym': '2026-01',
    ':start': '2026-01-01T00:00:00Z',
    ':end': '2026-01-31T23:59:59Z',
  },
}));
```

## Arquivos Afetados

| Arquivo | Mudança |
|---------|---------|
| `packages/infra/src/cantina-stack.ts` | Adicionar GSI |
| `packages/backend/src/repositories/sale.repository.ts` | Adicionar `yearMonth` ao criar Sale |
| `packages/backend/src/repositories/report.repository.ts` | Usar Query em vez de Scan |

## Passo a Passo

### 1. Adicionar GSI no CDK

```typescript
// packages/infra/src/cantina-stack.ts

salesTable.addGlobalSecondaryIndex({
  indexName: 'month-createdAt-index',
  partitionKey: { name: 'yearMonth', type: dynamodb.AttributeType.STRING },
  sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
});
```

### 2. Atualizar criação de Sale

```typescript
// packages/backend/src/repositories/sale.repository.ts

export async function createSale(...): Promise<Sale> {
  const createdAt = new Date().toISOString();
  const yearMonth = createdAt.substring(0, 7);  // "2026-01"
  
  const sale: Sale = {
    id: uuidv4(),
    // ... outros campos
    createdAt,
    yearMonth,  // Novo campo
  };
  
  await docClient.send(new PutCommand({ TableName, Item: sale }));
  return sale;
}
```

### 3. Atualizar tipo Sale

```typescript
// packages/shared/src/types/sale.ts

export interface Sale {
  // ... campos existentes
  yearMonth: string;  // "YYYY-MM" para GSI
}
```

### 4. Atualizar report.repository.ts

```typescript
// packages/backend/src/repositories/report.repository.ts

export async function getSalesByDateRange(
  startDate: string,
  endDate: string
): Promise<Sale[]> {
  const startMonth = startDate.substring(0, 7);
  const endMonth = endDate.substring(0, 7);
  
  // Se mesmo mês, uma query
  if (startMonth === endMonth) {
    return querySalesByMonth(startMonth, startDate, endDate);
  }
  
  // Se múltiplos meses, query por cada mês
  const months = getMonthsBetween(startMonth, endMonth);
  const results = await Promise.all(
    months.map(month => querySalesByMonth(month, startDate, endDate))
  );
  return results.flat();
}

async function querySalesByMonth(
  yearMonth: string,
  startDate: string,
  endDate: string
): Promise<Sale[]> {
  const result = await docClient.send(new QueryCommand({
    TableName: SALES_TABLE,
    IndexName: 'month-createdAt-index',
    KeyConditionExpression: 'yearMonth = :ym AND createdAt BETWEEN :start AND :end',
    ExpressionAttributeValues: {
      ':ym': yearMonth,
      ':start': startDate,
      ':end': endDate,
    },
  }));
  return (result.Items || []) as Sale[];
}
```

### 5. Migrar dados existentes

```bash
# Adicionar yearMonth às vendas existentes
aws dynamodb scan --table-name cantina-sales --profile cantina \
  --projection-expression "id,createdAt" > sales-to-update.json

# Script para atualizar cada venda:
for sale in sales:
  yearMonth = sale.createdAt[:7]
  aws dynamodb update-item \
    --table-name cantina-sales \
    --key '{"id":{"S":"'$sale.id'"}}' \
    --update-expression "SET yearMonth = :ym" \
    --expression-attribute-values '{":ym":{"S":"'$yearMonth'"}}'
```

### 6. Deploy e testar

```bash
# 1. Deploy CDK (cria GSI)
cd packages/infra && npx cdk deploy CantinaBetaStack ...

# 2. Migrar dados
node scripts/add-yearmonth-to-sales.js --env beta

# 3. Deploy Lambda
npm run build:lambda && cdk deploy ...

# 4. Testar relatório global com filtro de data
```

## Riscos e Mitigações

| Risco | Probabilidade | Mitigação |
|-------|---------------|-----------|
| GSI demora para popular | Baixa | Aguardar status ACTIVE |
| Vendas antigas sem yearMonth | Média | Script de migração |
| Query cross-month complexa | Baixa | Helper function |

## Critérios de Sucesso

- [ ] GSI criado e ACTIVE
- [ ] Novas vendas têm yearMonth
- [ ] Vendas antigas migradas
- [ ] Relatório por período usa Query (não Scan)
- [ ] Performance melhorada

## Checklist de Implementação

- [ ] Adicionar GSI no CDK
- [ ] Atualizar tipo Sale
- [ ] Atualizar sale.repository.ts
- [ ] Criar script de migração
- [ ] Atualizar report.repository.ts
- [ ] Deploy beta (CDK)
- [ ] Aguardar GSI ACTIVE
- [ ] Migrar dados beta
- [ ] Deploy Lambda beta
- [ ] Testar relatórios
- [ ] Deploy produção
- [ ] Migrar dados produção
- [ ] Atualizar status neste documento

## Lições Aprendidas

*(Preencher após implementação)*

---

*Criado: 2026-01-05*
*Última atualização: 2026-01-05*
