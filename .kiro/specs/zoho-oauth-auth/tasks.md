# Implementation Plan

## Zoho OAuth Authentication

- [ ] 1. Setup e configuração base
  - [ ] 1.1 Adicionar dependências necessárias ao backend
    - Instalar: `cookie-parser`, `@types/cookie-parser` (uuid já existe)
    - Instalar fast-check para property-based testing: `fast-check` (já existe no root)
    - _Requirements: 6.5_
  - [ ] 1.2 Criar arquivo de configuração de ambiente
    - Criar `packages/backend/src/auth/config.ts` com variáveis de ambiente
    - Definir interface AuthConfig com ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, etc.
    - _Requirements: 6.1, 6.2_
  - [ ] 1.3 Criar .env.example na raiz do backend
    - Documentar todas as variáveis necessárias
    - Adicionar .env ao .gitignore se não estiver
    - _Requirements: 6.1_

- [ ] 2. Implementar validação de domínio de email
  - [ ] 2.1 Criar domain-validator.ts
    - Implementar função `isAllowedDomain(email: string): boolean`
    - Validar que email termina com @advm.lu (case-insensitive)
    - _Requirements: 1.5, 1.6_
  - [ ]* 2.2 Escrever property test para validação de domínio
    - **Property 2: Email Domain Validation**
    - **Validates: Requirements 1.5, 1.6**

- [ ] 3. Implementar ZohoOAuthService
  - [ ] 3.1 Criar zoho-oauth.service.ts
    - Implementar `getAuthorizationUrl(state: string): string`
    - Implementar `exchangeCodeForTokens(code: string): Promise<TokenResponse>`
    - Implementar `refreshAccessToken(refreshToken: string): Promise<TokenResponse>`
    - Implementar `getUserInfo(accessToken: string): Promise<ZohoUserInfo>`
    - Implementar `revokeToken(token: string): Promise<void>`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.3_
  - [ ]* 3.2 Escrever property test para geração de URL OAuth
    - **Property 1: OAuth URL Generation**
    - **Validates: Requirements 1.1, 6.1**
  - [ ]* 3.3 Escrever unit tests para ZohoOAuthService
    - Testar formatação de requests para Zoho API
    - Testar parsing de responses
    - _Requirements: 1.2, 1.3, 1.4_

- [ ] 4. Implementar SessionService
  - [ ] 4.1 Criar session.service.ts
    - Implementar store em memória para sessões
    - Implementar `createSession(user, tokens): Session`
    - Implementar `getSession(sessionId): Session | null`
    - Implementar `updateSession(sessionId, updates): void`
    - Implementar `deleteSession(sessionId): void`
    - Implementar `isAccessTokenExpired(session): boolean`
    - _Requirements: 1.7, 2.1, 2.2, 2.4, 2.5_
  - [ ]* 4.2 Escrever property test para sessões válidas
    - **Property 3: Session Validity**
    - **Validates: Requirements 2.2, 3.2**
  - [ ]* 4.3 Escrever property test para serialização de auth state
    - **Property 7: Auth State Serialization Round-Trip**
    - **Validates: Requirements 5.2**

- [ ] 5. Implementar AuthMiddleware
  - [ ] 5.1 Criar auth.middleware.ts
    - Implementar `requireAuth` middleware
    - Implementar refresh automático de token expirado
    - Configurar cookie-parser no Express
    - _Requirements: 3.1, 3.2, 3.3, 3.4_
  - [ ]* 5.2 Escrever property test para rejeição de requests não autenticados
    - **Property 5: Unauthenticated Request Rejection**
    - **Validates: Requirements 3.1, 3.4**
  - [ ]* 5.3 Escrever property test para refresh transparente de token
    - **Property 4: Token Refresh Transparency**
    - **Validates: Requirements 2.3, 3.3**
  - [ ]* 5.4 Escrever property test para atributos de cookie
    - **Property 6: Cookie Security Attributes**
    - **Validates: Requirements 6.5**

- [ ] 6. Implementar AuthController e rotas
  - [ ] 6.1 Criar auth.controller.ts
    - Implementar handler para GET /api/auth/login
    - Implementar handler para GET /api/auth/callback (GET, não POST - Zoho redireciona com query params)
    - Implementar handler para GET /api/auth/me
    - Implementar handler para POST /api/auth/logout
    - _Requirements: 6.1, 6.2, 6.3, 6.4_
  - [ ] 6.2 Criar auth.routes.ts e integrar ao router principal
    - Definir rotas de autenticação
    - Registrar no router.ts existente
    - _Requirements: 6.1, 6.2, 6.3, 6.4_
  - [ ]* 6.3 Escrever unit tests para AuthController
    - Testar cada endpoint
    - Testar error handling
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [ ] 7. Checkpoint - Backend
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Implementar AuthContext no frontend
  - [ ] 8.1 Criar AuthContext.tsx e AuthProvider.tsx
    - Definir AuthContextValue interface
    - Implementar provider com estado de autenticação
    - Implementar verificação de sessão no mount
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  - [ ] 8.2 Criar useAuth.ts hook
    - Exportar hook que consome AuthContext
    - _Requirements: 5.3, 5.4_
  - [ ]* 8.3 Escrever unit tests para AuthContext
    - Testar estados de loading, authenticated, error
    - _Requirements: 5.1, 5.2_

- [ ] 9. Implementar componentes de UI de autenticação
  - [ ] 9.1 Criar LoginPage.tsx
    - Exibir logo ADVM e nome do app
    - Botão "Entrar com Zoho"
    - Exibir mensagens de erro
    - Redirect se já autenticado
    - _Requirements: 4.1, 4.2, 4.3, 4.4_
  - [ ] 9.2 Criar ProtectedRoute.tsx
    - HOC que verifica autenticação
    - Redirect para /login se não autenticado
    - _Requirements: 4.1_
  - [ ] 9.3 Criar CallbackPage.tsx
    - Página que recebe o code do Zoho
    - Envia code para backend
    - Redirect para app após sucesso
    - _Requirements: 1.2_

- [ ] 10. Integrar autenticação no App.tsx
  - [ ] 10.1 Envolver App com AuthProvider
    - Adicionar AuthProvider como wrapper
    - _Requirements: 5.1_
  - [ ] 10.2 Adicionar rotas de autenticação
    - Rota /login para LoginPage
    - Rota /auth/callback para CallbackPage
    - Proteger rotas existentes com ProtectedRoute
    - _Requirements: 4.1, 4.3_
  - [ ] 10.3 Exibir email do usuário na navbar
    - Usar useAuth para obter user info
    - Adicionar botão de logout
    - _Requirements: 1.8, 2.5_

- [ ] 11. Checkpoint - Frontend
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 12. Atualizar ApiClient para usar cookies
  - [ ] 12.1 Modificar ApiClient para incluir credentials
    - Adicionar `credentials: 'include'` em todas as requests
    - Remover lógica de token no header (agora usa cookie)
    - _Requirements: 3.2, 6.5_
  - [ ] 12.2 Atualizar onUnauthorized callback
    - Integrar com AuthContext para redirect
    - _Requirements: 3.1_

- [ ] 13. Final Checkpoint
  - Ensure all tests pass, ask the user if questions arise.
