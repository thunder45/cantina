# Plano de Melhorias - Cantina POS

## Visão Geral

Este documento consolida as melhorias arquiteturais identificadas para o sistema Cantina POS.
Cada melhoria tem seu próprio documento detalhado na pasta `docs/improvements/`.

## Status das Melhorias

| # | Melhoria | Prioridade | Esforço | Status |
|---|----------|------------|---------|--------|
| 1 | [Transações DynamoDB Atômicas](./001-dynamodb-transactions.md) | 🔴 Alta | Baixo | ✅ Concluído |
| 2 | [Remover creditLimit](./002-remove-credit-limit.md) | 🟡 Média | Baixo | ✅ Concluído |
| 3 | [Separar Tabela de Transactions](./003-separate-transactions-table.md) | 🟡 Média | Médio | Pendente |
| 4 | [GSI para Relatórios por Data](./004-gsi-reports-by-date.md) | 🟡 Média | Baixo | ✅ Concluído |
| 5 | [Validação com Zod](./005-zod-validation.md) | 🟢 Baixa | Médio | ✅ Concluído |
| 6 | [Separar Lambdas por Domínio](./006-separate-lambdas.md) | 🟢 Baixa | Médio | Futuro |
| 7 | [Cache para Relatórios](./007-reports-cache.md) | 🟢 Baixa | Alto | Futuro |
| 8 | [Event Sourcing](./008-event-sourcing.md) | 🟢 Baixa | Alto | Futuro |

## Matriz de Decisão

```
                    ESFORÇO
                Baixo    Médio    Alto
           ┌─────────┬─────────┬─────────┐
     Alto  │  #1 ✅  │         │   #8    │
IMPACTO    ├─────────┼─────────┼─────────┤
     Médio │  #4 ✅  │  #3 #5✅│   #7    │
           ├─────────┼─────────┼─────────┤
     Baixo │  #2 ✅  │   #6    │         │
           └─────────┴─────────┴─────────┘

✅ = Concluído
```

## Ordem de Execução Recomendada

### Fase 1 - Quick Wins ✅ CONCLUÍDO
1. **#1 Transações DynamoDB** - ✅ Elimina risco de inconsistência
2. **#2 Remover creditLimit** - ✅ Limpeza de código morto

### Fase 2 - Fundação (parcial)
3. **#4 GSI para Relatórios** - ✅ Melhora performance
4. **#3 Separar Transactions** - Pendente (melhora modelo de dados)

### Fase 3 - Qualidade ✅ CONCLUÍDO
5. **#5 Validação Zod** - ✅ Melhora robustez

### Fase 4 - Escala (Futuro)
6. **#6 Separar Lambdas** - Quando necessário
7. **#7 Cache Relatórios** - Quando necessário
8. **#8 Event Sourcing** - Se requisitos mudarem

## Como Usar Esta Documentação

### Antes de Implementar
1. Leia o documento específico da melhoria
2. Verifique pré-requisitos
3. Revise os arquivos afetados
4. Entenda os riscos

### Durante Implementação
1. Siga o checklist do documento
2. Teste em beta primeiro
3. Documente decisões tomadas

### Após Implementar
1. Atualize status neste README
2. Adicione lições aprendidas no documento
3. Commit com referência ao documento

## Convenções dos Documentos

Cada documento de melhoria segue a estrutura:

```markdown
# Título da Melhoria

## Resumo
## Problema Atual
## Solução Proposta
## Arquivos Afetados
## Passo a Passo
## Riscos e Mitigações
## Critérios de Sucesso
## Checklist de Implementação
```

---

*Última atualização: 2026-01-05*
