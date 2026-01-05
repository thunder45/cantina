# 007 - Cache para Relatórios

## Resumo

| Campo | Valor |
|-------|-------|
| Prioridade | 🟢 Baixa |
| Esforço | Alto (3-5 dias) |
| Risco | Médio |
| Status | Futuro |

Implementar cache para relatórios frequentemente acessados.

## Problema Atual

Relatórios recalculam tudo a cada request:

```typescript
// report.service.ts
export async function getEventReport(eventId: string): Promise<EventReport> {
  const sales = await saleRepository.getSalesByEvent(eventId);  // Query
  const items = aggregateItems(sales);                          // Cálculo
  const payments = aggregatePayments(sales);                    // Cálculo
  return { sales, items, payments, totals };                    // Retorno
}
```

**Problemas**:
- Mesmo relatório recalculado múltiplas vezes
- Latência alta para eventos com muitas vendas
- Custo de leitura DynamoDB repetido

## Solução Proposta

Cache em DynamoDB com TTL:

```typescript
// Estrutura do cache
{
  PK: "REPORT#EVENT#event-123",
  SK: "2026-01-05T10:00:00Z",  // Timestamp de geração
  data: { ... },               // Relatório serializado
  TTL: 1704456000,             // Unix timestamp para expiração
}
```

**Estratégia**:
1. Verificar cache antes de calcular
2. Se cache válido, retornar
3. Se não, calcular e salvar no cache
4. Invalidar cache quando Sale é criada/atualizada

## Arquivos Afetados

| Arquivo | Mudança |
|---------|---------|
| `packages/infra/src/cantina-stack.ts` | Criar tabela de cache |
| `packages/backend/src/repositories/cache.repository.ts` | Novo repository |
| `packages/backend/src/services/report.service.ts` | Usar cache |
| `packages/backend/src/services/sales.service.ts` | Invalidar cache |

## Modelo de Cache

### Tabela: cantina-report-cache

| Atributo | Tipo | Descrição |
|----------|------|-----------|
| PK | String | Tipo + ID (ex: "REPORT#EVENT#123") |
| SK | String | Timestamp de geração |
| data | Map | Relatório serializado |
| TTL | Number | Unix timestamp para expiração |

### TTL por Tipo de Relatório

| Tipo | TTL | Motivo |
|------|-----|--------|
| EventReport | 5 min | Atualiza frequentemente durante evento |
| GlobalReport | 15 min | Menos crítico, mais pesado |
| StockReport | 1 min | Precisa ser atual |

## Passo a Passo

### 1. Criar tabela de cache

```typescript
// packages/infra/src/cantina-stack.ts

const cacheTable = new dynamodb.Table(this, 'CacheTable', {
  tableName: `${envPrefix}cantina-report-cache`,
  partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
  sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
  billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
  removalPolicy: cdk.RemovalPolicy.DESTROY,  // Cache pode ser recriado
  timeToLiveAttribute: 'TTL',
});
```

### 2. Criar cache repository

```typescript
// packages/backend/src/repositories/cache.repository.ts

const TABLE_NAME = process.env.CACHE_TABLE;
const TTL_MINUTES = {
  EVENT_REPORT: 5,
  GLOBAL_REPORT: 15,
  STOCK_REPORT: 1,
};

export async function getCache<T>(key: string): Promise<T | null> {
  if (!isProduction) return null;
  
  const result = await docClient.send(new QueryCommand({
    TableName: TABLE_NAME,
    KeyConditionExpression: 'PK = :pk',
    ExpressionAttributeValues: { ':pk': key },
    ScanIndexForward: false,
    Limit: 1,
  }));
  
  if (!result.Items?.length) return null;
  
  const item = result.Items[0];
  const now = Math.floor(Date.now() / 1000);
  if (item.TTL < now) return null;  // Expirado
  
  return item.data as T;
}

export async function setCache<T>(
  key: string, 
  data: T, 
  ttlMinutes: number
): Promise<void> {
  if (!isProduction) return;
  
  const now = new Date();
  const ttl = Math.floor(now.getTime() / 1000) + (ttlMinutes * 60);
  
  await docClient.send(new PutCommand({
    TableName: TABLE_NAME,
    Item: {
      PK: key,
      SK: now.toISOString(),
      data,
      TTL: ttl,
    },
  }));
}

export async function invalidateCache(keyPrefix: string): Promise<void> {
  if (!isProduction) return;
  
  // Query e delete todos os items com o prefixo
  const result = await docClient.send(new QueryCommand({
    TableName: TABLE_NAME,
    KeyConditionExpression: 'begins_with(PK, :prefix)',
    ExpressionAttributeValues: { ':prefix': keyPrefix },
  }));
  
  for (const item of result.Items || []) {
    await docClient.send(new DeleteCommand({
      TableName: TABLE_NAME,
      Key: { PK: item.PK, SK: item.SK },
    }));
  }
}
```

### 3. Atualizar report.service.ts

```typescript
// packages/backend/src/services/report.service.ts

import * as cacheRepository from '../repositories/cache.repository';

export async function getEventReport(eventId: string): Promise<EventReport> {
  const cacheKey = `REPORT#EVENT#${eventId}`;
  
  // Tentar cache
  const cached = await cacheRepository.getCache<EventReport>(cacheKey);
  if (cached) return cached;
  
  // Calcular
  const report = await calculateEventReport(eventId);
  
  // Salvar no cache
  await cacheRepository.setCache(cacheKey, report, 5);
  
  return report;
}
```

### 4. Invalidar cache em sales.service.ts

```typescript
// packages/backend/src/services/sales.service.ts

export async function createSale(...): Promise<Sale> {
  const sale = await saleRepository.createSale(...);
  
  // Invalidar caches relacionados
  await cacheRepository.invalidateCache(`REPORT#EVENT#${sale.eventId}`);
  await cacheRepository.invalidateCache('REPORT#GLOBAL');
  
  return sale;
}
```

## Riscos e Mitigações

| Risco | Probabilidade | Mitigação |
|-------|---------------|-----------|
| Cache stale | Média | TTL curto + invalidação ativa |
| Complexidade | Média | Abstração em repository |
| Custo adicional | Baixa | TTL limpa automaticamente |

## Critérios de Sucesso

- [ ] Relatório cacheado retorna em < 100ms
- [ ] Cache invalidado quando Sale muda
- [ ] TTL funciona (items expiram)
- [ ] Dev mode funciona sem cache

## Quando Implementar

Esta melhoria é para **futuro**, quando:
- Latência de relatórios se tornar problema
- Volume de acessos a relatórios aumentar
- Custo de DynamoDB reads for significativo

**Não implementar agora** porque:
- Relatórios são rápidos o suficiente
- Volume de acessos é baixo
- Complexidade adicional não justificada

## Alternativas Consideradas

### ElastiCache/DAX
- **Prós**: Mais rápido, gerenciado
- **Contras**: Custo fixo mensal, complexidade de VPC
- **Decisão**: DynamoDB TTL é suficiente para o volume atual

### API Gateway Cache
- **Prós**: Zero código
- **Contras**: Não invalida por evento, TTL fixo
- **Decisão**: Precisamos invalidação granular

## Checklist de Implementação

*(Para quando for implementar)*

- [ ] Criar tabela de cache
- [ ] Criar cache.repository.ts
- [ ] Atualizar report.service.ts
- [ ] Atualizar sales.service.ts
- [ ] Testar cache hit/miss
- [ ] Testar invalidação
- [ ] Testar TTL
- [ ] Medir latência antes/depois
- [ ] Deploy beta
- [ ] Deploy produção
- [ ] Atualizar status neste documento

## Lições Aprendidas

*(Preencher após implementação)*

---

*Criado: 2026-01-05*
*Última atualização: 2026-01-05*
