# Plano de Internacionalização (i18n)

## Objetivo
Adicionar suporte multi-idioma ao Sistema POS Cantina: Português (default), Inglês e Francês.

## Status: 🟡 Planeado (não iniciado)

---

## Decisões Técnicas

| Aspecto | Decisão |
|---------|---------|
| Biblioteca | `react-i18next` + `i18next` |
| Localização traduções | `packages/shared/src/i18n/locales/` |
| Formato | JSON com namespaces |
| Detecção idioma | Auto-detect browser + selector manual |
| Persistência | localStorage |
| Backend | Traduções inline para CSV export |

---

## Estrutura de Ficheiros

```
packages/shared/src/i18n/
├── index.ts              # Inicialização i18next
├── types.ts              # Tipos TypeScript
└── locales/
    ├── pt.json           # Português (extraído do código atual)
    ├── en.json           # Inglês
    └── fr.json           # Francês

packages/frontend-web/src/
├── components/
│   └── common/
│       └── LanguageSelector.tsx  # Selector de idioma
└── i18n.ts               # Import e init do i18n no app
```

---

## Fases de Implementação

### Fase 1: Setup ⬜
- [ ] Instalar dependências: `npm install i18next react-i18next i18next-browser-languagedetector`
- [ ] Criar `packages/shared/src/i18n/index.ts` com config base
- [ ] Criar `packages/shared/src/i18n/types.ts` com tipos
- [ ] Exportar i18n do shared package

### Fase 2: Extrair Strings PT ⬜
- [ ] Criar `packages/shared/src/i18n/locales/pt.json` com namespaces:
  - `common` - botões, ações genéricas
  - `nav` - navegação
  - `payment` - métodos de pagamento
  - `events` - gestão de eventos
  - `menu` - gestão de menu
  - `sales` - vendas e checkout
  - `customers` - clientes
  - `reports` - relatórios
  - `errors` - mensagens de erro
  - `validation` - validações

### Fase 3: Traduzir EN/FR ⬜
- [ ] Criar `en.json` baseado em `pt.json`
- [ ] Criar `fr.json` baseado em `pt.json`

### Fase 4: Migrar Componentes ⬜
Ficheiros a migrar (por ordem de prioridade):

**Shared/Common:**
- [ ] `packages/frontend-web/src/App.tsx` (nav labels)

**Pagamentos:**
- [ ] `packages/frontend-web/src/components/sales/PaymentModal.tsx`
- [ ] `packages/frontend-web/src/components/sales/ReceiptModal.tsx`
- [ ] `packages/frontend-web/src/components/common/ReceiptView.tsx`

**Relatórios:**
- [ ] `packages/frontend-web/src/components/reports/GlobalReportView.tsx`
- [ ] `packages/frontend-web/src/components/reports/EventReportView.tsx`
- [ ] `packages/frontend-web/src/components/reports/CategoryReportView.tsx`
- [ ] `packages/frontend-web/src/pages/ReportsPage.tsx`

**Clientes:**
- [ ] `packages/frontend-web/src/components/customers/CustomerHistory.tsx`
- [ ] `packages/frontend-web/src/components/customers/TransactionModal.tsx`
- [ ] `packages/frontend-web/src/components/customers/PaymentRegistrationModal.tsx`
- [ ] `packages/frontend-web/src/pages/CustomersPage.tsx`

**Vendas:**
- [ ] `packages/frontend-web/src/pages/SalesPage.tsx`

**Eventos/Menu:**
- [ ] `packages/frontend-web/src/pages/EventsPage.tsx`
- [ ] `packages/frontend-web/src/pages/MenuPage.tsx`
- [ ] `packages/frontend-web/src/components/events/CategoryList.tsx`

### Fase 5: Language Selector ⬜
- [ ] Criar `LanguageSelector.tsx` componente
- [ ] Adicionar ao header do `App.tsx`
- [ ] Persistir escolha em localStorage

### Fase 6: Backend i18n ⬜
- [ ] Criar traduções em `packages/backend/src/i18n/translations.ts`
- [ ] Atualizar `report.service.ts` para usar traduções
- [ ] Aceitar header `Accept-Language` na API

### Fase 7: Testes e Polish ⬜
- [ ] Testar todos os fluxos em PT
- [ ] Testar todos os fluxos em EN
- [ ] Testar todos os fluxos em FR
- [ ] Verificar formatação de números/datas
- [ ] Deploy Beta → teste → Deploy Prod

---

## Namespaces e Keys (Estrutura)

```json
{
  "common": {
    "save": "",
    "cancel": "",
    "delete": "",
    "edit": "",
    "close": "",
    "confirm": "",
    "loading": "",
    "error": "",
    "success": "",
    "search": "",
    "noResults": "",
    "total": "",
    "date": "",
    "time": ""
  },
  "nav": {
    "events": "",
    "menu": "",
    "sales": "",
    "customers": "",
    "reports": ""
  },
  "payment": {
    "cash": "",
    "card": "",
    "transfer": "",
    "credit": "",
    "balance": "",
    "gift": "",
    "mixed": "",
    "selectMethod": "",
    "amount": ""
  },
  "events": {
    "title": "",
    "create": "",
    "edit": "",
    "name": "",
    "dates": "",
    "category": "",
    "active": "",
    "noEvents": ""
  },
  "menu": {
    "title": "",
    "addItem": "",
    "price": "",
    "stock": "",
    "unlimited": "",
    "catalog": "",
    "groups": ""
  },
  "sales": {
    "title": "",
    "newSale": "",
    "confirmSale": "",
    "refund": "",
    "refundReason": "",
    "receipt": "",
    "history": "",
    "items": "",
    "quantity": "",
    "subtotal": "",
    "selectCustomer": ""
  },
  "customers": {
    "title": "",
    "create": "",
    "name": "",
    "balance": "",
    "debt": "",
    "history": "",
    "registerPayment": "",
    "deposit": "",
    "noCustomers": ""
  },
  "reports": {
    "title": "",
    "global": "",
    "byEvent": "",
    "byCategory": "",
    "totalSales": "",
    "totalPaid": "",
    "totalPending": "",
    "totalGifted": "",
    "totalRefunded": "",
    "paymentMethods": "",
    "itemsSold": "",
    "exportCsv": "",
    "filter": "",
    "period": "",
    "noData": ""
  },
  "errors": {
    "generic": "",
    "network": "",
    "notFound": "",
    "validation": "",
    "unauthorized": ""
  }
}
```

---

## Comandos de Deploy (após implementação)

```bash
# Build shared (inclui i18n)
cd packages/shared && npm run build

# Build e deploy Beta
cd packages/frontend-web
VITE_SKIP_AUTH=true VITE_API_URL=https://cantina-beta.advm.lu npm run build
aws s3 sync dist/ s3://beta-cantina-frontend-625272706584 --delete --profile cantina
aws cloudfront create-invalidation --distribution-id E3RFATVK47GGJ7 --paths "/*" --profile cantina

# Após testes, deploy Prod
npm run build
aws s3 sync dist/ s3://cantina-frontend-625272706584 --delete --profile cantina
aws cloudfront create-invalidation --distribution-id E7R30G3Z8J2DI --paths "/*" --profile cantina
```

---

## Notas

- Manter PT como idioma default (fallback)
- Usar `t('key')` para strings simples
- Usar `t('key', { var: value })` para interpolação
- Usar `Trans` component para strings com JSX
- Formatação de moeda: `Intl.NumberFormat` com locale
- Formatação de data: `Intl.DateTimeFormat` com locale
