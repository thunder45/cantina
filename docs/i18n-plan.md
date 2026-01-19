# Plano de Internacionalização (i18n)

## Objetivo
Adicionar suporte multi-idioma ao Sistema POS Cantina: Português (default), Inglês e Francês.

## Status: ✅ Frontend Completo

### Progresso
- [x] Fase 1: Setup (i18next instalado e configurado)
- [x] Fase 2: Extrair strings PT (pt.json criado)
- [x] Fase 3: Traduzir EN/FR (en.json e fr.json criados)
- [x] Fase 4: Migrar componentes (30+ componentes migrados)
- [x] Fase 5: Language Selector (implementado no header)
- [ ] Fase 6: Backend i18n
- [ ] Fase 7: Testes e Polish

### Deployed em Beta para testes: https://cantina-beta.advm.lu

### Componentes Migrados
- App.tsx, PaymentModal, GlobalReportView, SalesPage
- EventReportView, CategoryReportView, ReceiptModal, ReceiptView
- ReportsPage, CustomerHistory, TransactionModal, PaymentRegistrationModal
- CustomersPage, EventsPage, MenuPage, CategoryList
- MenuGroupList, EditMenuItemModal, AddMenuItemForm, CatalogBrowser
- CreateCatalogItemForm, CustomerSearch, CustomerSelectModal
- EventForm, EventList, OrderSummary, MenuItemGrid
- StockReportView, CategoryReportsPage, ProtectedRoute

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

### Fase 1: Setup ✅
- [x] Instalar dependências: `npm install i18next react-i18next i18next-browser-languagedetector`
- [x] Criar `packages/shared/src/i18n/index.ts` com config base
- [x] Exportar i18n do shared package

### Fase 2: Extrair Strings PT ✅
- [x] Criar `packages/shared/src/i18n/locales/pt.json` com namespaces

### Fase 3: Traduzir EN/FR ✅
- [x] Criar `en.json` baseado em `pt.json`
- [x] Criar `fr.json` baseado em `pt.json`

### Fase 4: Migrar Componentes ✅
Ficheiros migrados:
- [x] `packages/frontend-web/src/App.tsx` (nav labels, logout)
- [x] `packages/frontend-web/src/components/sales/PaymentModal.tsx`
- [x] `packages/frontend-web/src/components/reports/GlobalReportView.tsx`
- [x] `packages/frontend-web/src/pages/SalesPage.tsx`
- [x] `packages/frontend-web/src/components/reports/EventReportView.tsx`
- [x] `packages/frontend-web/src/components/reports/CategoryReportView.tsx`
- [x] `packages/frontend-web/src/components/sales/ReceiptModal.tsx`
- [x] `packages/frontend-web/src/components/common/ReceiptView.tsx`
- [x] `packages/frontend-web/src/pages/ReportsPage.tsx`
- [x] `packages/frontend-web/src/components/customers/CustomerHistory.tsx`
- [x] `packages/frontend-web/src/components/customers/TransactionModal.tsx`
- [x] `packages/frontend-web/src/components/customers/PaymentRegistrationModal.tsx`
- [x] `packages/frontend-web/src/pages/CustomersPage.tsx`
- [x] `packages/frontend-web/src/pages/EventsPage.tsx`
- [x] `packages/frontend-web/src/pages/MenuPage.tsx`
- [x] `packages/frontend-web/src/components/events/CategoryList.tsx`

### Fase 5: Language Selector ✅
- [x] Criar `LanguageSelector.tsx` componente
- [x] Adicionar ao header do `App.tsx`
- [x] Persistir escolha em localStorage (via i18next-browser-languagedetector)

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
