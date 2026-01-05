# 008 - Event Sourcing

## Resumo

| Campo | Valor |
|-------|-------|
| Prioridade | 🟢 Baixa |
| Esforço | Alto (1-2 semanas) |
| Risco | Alto |
| Status | Futuro |

Migrar para arquitetura Event Sourcing para transações financeiras.

## Contexto

O sistema já tem características de Event Sourcing:
- Transações são imutáveis (append-only)
- Saldo é calculado a partir das transações
- Histórico completo é preservado

**Event Sourcing completo** formalizaria isso:
- Eventos como fonte de verdade
- Projeções derivadas dos eventos
- Replay possível para reconstruir estado

## Problema Atual

Embora as transações sejam imutáveis, o sistema não é puramente Event Sourcing:

```typescript
// Saldo calculado on-demand
export async function calculateBalance(customerId: string): Promise<number> {
  const txs = await getTransactionsByCustomer(customerId);
  return txs.reduce((sum, tx) => {
    if (tx.type === 'deposit' || tx.type === 'refund') return sum + tx.amount;
    if (tx.type === 'withdrawal' || tx.type === 'purchase') return sum - tx.amount;
    return sum;
  }, initialBalance);
}
```

**Problemas**:
- Cálculo repetido a cada request
- Não há snapshot do estado
- Difícil fazer queries complexas sobre histórico

## Solução Proposta

### Arquitetura Event Sourcing

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Command       │────▶│   Event Store   │────▶│   Projections   │
│   (Deposit)     │     │   (DynamoDB)    │     │   (DynamoDB)    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌─────────────────┐
                        │   Event Bus     │
                        │   (EventBridge) │
                        └─────────────────┘
                               │
                    ┌──────────┼──────────┐
                    ▼          ▼          ▼
              ┌─────────┐ ┌─────────┐ ┌─────────┐
              │ Balance │ │ Reports │ │ Audit   │
              │ Proj.   │ │ Proj.   │ │ Proj.   │
              └─────────┘ └─────────┘ └─────────┘
```

### Eventos

```typescript
// Eventos de domínio
type CustomerEvent =
  | { type: 'CustomerCreated'; customerId: string; name: string; timestamp: string }
  | { type: 'DepositMade'; customerId: string; amount: number; method: string; timestamp: string }
  | { type: 'PurchaseMade'; customerId: string; amount: number; saleId: string; timestamp: string }
  | { type: 'PaymentApplied'; customerId: string; purchaseId: string; amount: number; timestamp: string }
  | { type: 'RefundIssued'; customerId: string; amount: number; saleId: string; timestamp: string };
```

### Event Store

```typescript
// Tabela: cantina-events
{
  PK: "CUSTOMER#abc-123",           // Aggregate ID
  SK: "2026-01-05T10:00:00.000Z#1", // Timestamp + sequence
  type: "DepositMade",
  data: { amount: 100, method: "cash" },
  version: 5,                        // Para optimistic locking
}
```

### Projeções

```typescript
// Tabela: cantina-customer-balances (projeção)
{
  customerId: "abc-123",
  balance: 150.00,
  lastEventVersion: 5,
  updatedAt: "2026-01-05T10:00:00Z",
}

// Atualizada por Lambda trigger no Event Store
```

## Benefícios

1. **Auditoria perfeita**: Todo histórico preservado
2. **Replay**: Reconstruir estado de qualquer ponto
3. **Debugging**: Ver exatamente o que aconteceu
4. **Projeções múltiplas**: Diferentes views dos mesmos dados
5. **Temporal queries**: "Qual era o saldo em 01/12?"

## Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Complexidade alta | Alta | Alto | Implementar incrementalmente |
| Eventual consistency | Alta | Médio | Projeções síncronas para críticos |
| Curva de aprendizado | Alta | Médio | Documentação detalhada |
| Migração de dados | Alta | Alto | Dual-write durante transição |

## Quando Implementar

Esta melhoria é para **futuro distante**, quando:
- Requisitos de auditoria aumentarem
- Necessidade de temporal queries
- Time crescer e precisar de arquitetura mais formal

**Não implementar agora** porque:
- Sistema atual funciona bem
- Complexidade muito alta para o benefício
- Time pequeno, overhead de manutenção
- Requisitos atuais não justificam

## Alternativa Mais Simples

Se precisar apenas de **saldo cacheado**, implementar #007 (Cache) é suficiente:

```typescript
// Projeção simples sem Event Sourcing completo
{
  customerId: "abc-123",
  balance: 150.00,
  lastTransactionId: "tx#xyz",
}

// Atualizado a cada transação
// Recalculado se inconsistente
```

## Referências

- [Martin Fowler - Event Sourcing](https://martinfowler.com/eaaDev/EventSourcing.html)
- [AWS Event Sourcing Pattern](https://docs.aws.amazon.com/prescriptive-guidance/latest/modernization-data-persistence/event-sourcing.html)
- [DynamoDB Event Store](https://aws.amazon.com/blogs/database/implementing-event-sourcing-with-amazon-dynamodb/)

## Checklist de Implementação

*(Para quando for implementar - muito futuro)*

- [ ] Definir todos os eventos de domínio
- [ ] Criar tabela Event Store
- [ ] Implementar append de eventos
- [ ] Criar projeção de saldo
- [ ] Criar Lambda para atualizar projeções
- [ ] Implementar replay
- [ ] Migrar dados existentes
- [ ] Dual-write durante transição
- [ ] Validar consistência
- [ ] Remover código antigo
- [ ] Documentar arquitetura
- [ ] Treinar time

## Lições Aprendidas

*(Preencher após implementação)*

---

*Criado: 2026-01-05*
*Última atualização: 2026-01-05*
