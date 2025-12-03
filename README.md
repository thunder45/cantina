# Cantina POS

Sistema de Ponto de Venda para Cantinas.

## Requisitos

- Node.js >= 18.0.0

## Estrutura do Projeto

```
cantina-pos/
├── packages/
│   ├── shared/          # Tipos e utilitários compartilhados
│   ├── backend/         # Lambda handlers e serviços AWS
│   ├── frontend-web/    # Aplicação React para browser
│   └── frontend-mobile/ # Aplicação React Native
└── package.json         # Configuração do monorepo
```

## Instalação

```bash
npm install
```

## Scripts

```bash
# Build de todos os packages
npm run build

# Rodar testes
npm test

# Rodar testes com coverage
npm run test:coverage

# Verificar tipos
npm run typecheck

# Linting
npm run lint

# Limpar build e node_modules
npm run clean
```

## Desenvolvimento

O projeto usa npm workspaces para gerenciar os packages. Cada package pode ser desenvolvido independentemente, mas compartilha tipos através do `@cantina-pos/shared`.
