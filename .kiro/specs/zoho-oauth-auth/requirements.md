# Requirements Document

## Introduction

Este documento especifica os requisitos para implementação de autenticação OAuth 2.0 usando Zoho como provedor de identidade para o sistema Cantina POS. A autenticação permitirá que usuários do domínio @advm.lu façam login de forma segura usando suas credenciais Zoho existentes, protegendo tanto o frontend web quanto a API backend.

## Technical Context

### Zoho OAuth 2.0 Endpoints (EU Datacenter)

| Endpoint | URL |
|----------|-----|
| Authorization | `https://accounts.zoho.eu/oauth/v2/auth` |
| Token | `https://accounts.zoho.eu/oauth/v2/token` |
| User Info | `https://accounts.zoho.eu/oauth/user/info` |
| Revoke | `https://accounts.zoho.eu/oauth/v2/token/revoke` |

### OAuth Flow Parameters

| Parameter | Value |
|-----------|-------|
| response_type | `code` |
| scope | `AaaServer.profile.Read` (case-sensitive!) |
| access_type | `offline` (para obter refresh token) |
| prompt | `consent` (opcional, força tela de consentimento) |

### Token Lifetimes

- Authorization Code: 2 minutos (uso único)
- Access Token: 1 hora
- Refresh Token: Não expira (até ser revogado)

### Architecture Decision

Como o frontend é uma SPA (Single Page Application), o client_secret não pode ser exposto no browser. Usaremos a arquitetura **Backend for Frontend (BFF)**:

1. Frontend redireciona para Zoho OAuth
2. Zoho redireciona de volta com authorization code
3. Frontend envia code para nosso backend
4. Backend troca code por tokens (usando client_secret)
5. Backend retorna session cookie httpOnly para frontend
6. Frontend usa cookie para autenticar requests à API

## Glossary

- **Zoho OAuth**: Serviço de autenticação OAuth 2.0 fornecido pela Zoho (accounts.zoho.eu para região EU)
- **Access Token**: Token de curta duração (1h) usado para acessar APIs Zoho
- **Refresh Token**: Token de longa duração usado para obter novos access tokens
- **Authorization Code**: Código temporário (2min) recebido após login, trocado por tokens
- **BFF (Backend for Frontend)**: Padrão onde o backend gerencia tokens OAuth de forma segura
- **Session Cookie**: Cookie httpOnly que identifica a sessão do usuário no backend

## Requirements

### Requirement 1: Login com Zoho

**User Story:** As a user, I want to log in using my Zoho account, so that I can access the Cantina POS system securely.

#### Acceptance Criteria

1. WHEN a user clicks the login button THEN the System SHALL redirect to `https://accounts.zoho.eu/oauth/v2/auth` with parameters: client_id, response_type=code, scope=AaaServer.profile.Read, redirect_uri, access_type=offline
2. WHEN Zoho redirects back with authorization code THEN the System SHALL send the code to backend endpoint `/api/auth/callback`
3. WHEN backend receives the code THEN the System SHALL exchange it for tokens using client_secret via POST to `https://accounts.zoho.eu/oauth/v2/token`
4. WHEN tokens are received THEN the System SHALL fetch user info from `https://accounts.zoho.eu/oauth/user/info`
5. WHEN user info is retrieved THEN the System SHALL verify email domain is @advm.lu
6. IF email domain is not @advm.lu THEN the System SHALL reject login with error "Acesso restrito a usuários @advm.lu"
7. WHEN login is successful THEN the System SHALL create session and set httpOnly cookie
8. WHEN user is authenticated THEN the System SHALL display user's email in navigation bar

### Requirement 2: Persistência de Sessão

**User Story:** As a user, I want to remain logged in across browser sessions, so that I don't have to log in every time I open the application.

#### Acceptance Criteria

1. WHEN application loads THEN the System SHALL check for valid session cookie via GET `/api/auth/me`
2. IF session is valid THEN the System SHALL return user info and set authenticated state
3. IF access token expired THEN the System SHALL use refresh token to obtain new access token transparently
4. IF refresh token is invalid THEN the System SHALL clear session and redirect to login
5. WHEN user clicks logout THEN the System SHALL call POST `/api/auth/logout`, clear session cookie, and redirect to login

### Requirement 3: Proteção de API

**User Story:** As a system administrator, I want to protect API endpoints, so that only authenticated users can access system data.

#### Acceptance Criteria

1. WHEN request to protected endpoint lacks valid session cookie THEN the System SHALL return HTTP 401 Unauthorized
2. WHEN request has valid session cookie THEN the System SHALL allow request to proceed
3. WHEN session exists but access token expired THEN the System SHALL refresh token before processing request
4. IF token refresh fails THEN the System SHALL return HTTP 401 with code "SESSION_EXPIRED"

### Requirement 4: Página de Login

**User Story:** As a user, I want to see a login page when not authenticated, so that I know I need to sign in to use the application.

#### Acceptance Criteria

1. WHEN unauthenticated user accesses any route THEN the System SHALL redirect to /login
2. WHEN login page loads THEN the System SHALL display ADVM logo, app name, and "Entrar com Zoho" button
3. WHEN authenticated user accesses /login THEN the System SHALL redirect to main application
4. IF login error occurs THEN the System SHALL display error message on login page

### Requirement 5: Auth Context (Frontend)

**User Story:** As a developer, I want authentication state managed centrally, so that all components can access user information consistently.

#### Acceptance Criteria

1. WHEN application initializes THEN the System SHALL create AuthContext with: user, isAuthenticated, isLoading, login(), logout()
2. WHEN auth state changes THEN the System SHALL notify all subscribed components
3. WHEN component needs user info THEN the System SHALL provide useAuth() hook
4. WHEN useAuth() is called THEN the System SHALL return: user (email, name), isAuthenticated, isLoading, login(), logout()

### Requirement 6: Backend Auth Endpoints

**User Story:** As a developer, I want backend endpoints to handle OAuth flow securely.

#### Acceptance Criteria

1. GET `/api/auth/login` SHALL return Zoho OAuth authorization URL
2. POST `/api/auth/callback` SHALL accept {code} and exchange for tokens, create session, return user info
3. GET `/api/auth/me` SHALL return current user info if authenticated, 401 if not
4. POST `/api/auth/logout` SHALL clear session and revoke tokens
5. All auth endpoints SHALL use httpOnly, secure, sameSite=strict cookies

## API Endpoints Summary

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | /api/auth/login | Get Zoho OAuth URL | No |
| POST | /api/auth/callback | Exchange code for session | No |
| GET | /api/auth/me | Get current user | Yes |
| POST | /api/auth/logout | End session | Yes |

## Environment Variables

```
ZOHO_CLIENT_ID=<from Zoho API Console>
ZOHO_CLIENT_SECRET=<from Zoho API Console>
ZOHO_REDIRECT_URI=https://cantina.advm.lu/api/auth/callback
SESSION_SECRET=<random 32+ char string>
ALLOWED_EMAIL_DOMAIN=advm.lu
```

## Security Considerations

1. Client secret NEVER exposed to frontend
2. Tokens stored only in backend (memory/database)
3. Session cookie: httpOnly, secure, sameSite=strict
4. Email domain validation prevents unauthorized access
5. HTTPS required in production
