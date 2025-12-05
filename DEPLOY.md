# Deploy Cantina POS na AWS

## Pré-requisitos

- AWS CLI configurado
- Node.js 18+
- Conta AWS com acesso admin

## Passo 1: Configurar DNS no Route 53

### 1.1 Criar Hosted Zone

```bash
aws route53 create-hosted-zone \
  --name advm.lu \
  --caller-reference "cantina-$(date +%s)" \
  --region eu-west-1
```

Anota os **nameservers** retornados (4 servidores NS).

### 1.2 Configurar Nameservers no dns.lu

1. Acessa o painel de controle do dns.lu/my.lu
2. Vai em "Gestão de Domínios" ou "Domain Management"
3. Seleciona `advm.lu`
4. Procura "Nameservers" ou "DNS Settings"
5. Substitui os nameservers atuais pelos 4 do Route 53:
   - `ns-XXX.awsdns-XX.org`
   - `ns-XXX.awsdns-XX.co.uk`
   - `ns-XXX.awsdns-XX.com`
   - `ns-XXX.awsdns-XX.net`
6. Salva as alterações

⚠️ **Propagação DNS pode levar até 48h** (geralmente 1-2h)

### 1.3 Verificar Propagação

```bash
dig NS advm.lu
```

Deve mostrar os nameservers da AWS.

## Passo 2: Configurar Credenciais AWS

### 2.1 Dar Permissões ao IAM User

No console AWS IAM, adiciona a policy `AdministratorAccess` ao user `cantina-dev` (temporariamente para o deploy inicial).

### 2.2 Configurar AWS CLI

```bash
aws configure --profile cantina
# AWS Access Key ID: [sua access key]
# AWS Secret Access Key: [sua secret key]
# Default region: eu-west-1
# Default output format: json
```

### 2.3 Exportar Profile

```bash
export AWS_PROFILE=cantina
export CDK_DEFAULT_ACCOUNT=625272706584
export CDK_DEFAULT_REGION=eu-west-1
```

## Passo 3: Bootstrap CDK

Só precisa fazer uma vez por conta/região:

```bash
cd packages/infra
npx cdk bootstrap aws://625272706584/eu-west-1
npx cdk bootstrap aws://625272706584/us-east-1  # Para certificado SSL
```

## Passo 4: Preparar Backend para Lambda

Antes do deploy, precisa criar o bundle do Lambda:

```bash
# TODO: Criar script de build para Lambda
cd packages/backend
npm run build
# Criar pasta dist/lambda com index.handler
```

## Passo 5: Deploy

```bash
cd packages/infra

# Ver o que vai ser criado
npx cdk diff

# Deploy
npx cdk deploy --all
```

O deploy vai:
1. Criar tabelas DynamoDB
2. Criar User Pool Cognito
3. Criar Lambda + API Gateway
4. Criar S3 bucket + CloudFront
5. Criar certificado SSL
6. Configurar DNS

## Passo 6: Deploy do Frontend

Após o CDK deploy, faz upload do frontend:

```bash
# Build frontend
cd packages/frontend-web
npm run build

# Upload para S3 (substitui BUCKET_NAME pelo output do CDK)
aws s3 sync dist/ s3://BUCKET_NAME --delete

# Invalidar cache CloudFront (substitui DISTRIBUTION_ID)
aws cloudfront create-invalidation \
  --distribution-id DISTRIBUTION_ID \
  --paths "/*"
```

## Passo 7: Criar Primeiro Usuário

```bash
aws cognito-idp admin-create-user \
  --user-pool-id USER_POOL_ID \
  --username admin@advm.lu \
  --user-attributes Name=email,Value=admin@advm.lu \
  --temporary-password "TempPass123!" \
  --message-action SUPPRESS
```

## Outputs Esperados

Após o deploy, terás:

| Recurso | URL/ID |
|---------|--------|
| Website | https://cantina.advm.lu |
| API | https://xxx.execute-api.eu-west-1.amazonaws.com/prod |
| User Pool | eu-west-1_XXXXXXX |
| S3 Bucket | cantina-frontend-625272706584 |

## Custos Estimados (Free Tier)

| Serviço | Free Tier | Uso Esperado |
|---------|-----------|--------------|
| S3 | 5GB | ~5MB ✅ |
| CloudFront | 1TB/mês | ~1GB ✅ |
| Lambda | 1M req/mês | ~10K ✅ |
| API Gateway | 1M req/mês | ~10K ✅ |
| DynamoDB | 25GB | ~100MB ✅ |
| Cognito | 50K MAU | 5 users ✅ |
| Route 53 | $0.50/zona | $0.50/mês |

**Total: ~$0.50-2/mês**

## Troubleshooting

### Certificado não valida
- Verifica se os nameservers propagaram: `dig NS advm.lu`
- Pode levar até 48h

### CloudFront 403
- Verifica se o S3 bucket tem os arquivos
- Verifica se OAC está configurado

### API retorna 401
- Verifica se o token Cognito está no header Authorization
- Verifica se o User Pool ID está correto

## Destruir Infraestrutura

```bash
cd packages/infra
npx cdk destroy --all
```

⚠️ As tabelas DynamoDB têm `removalPolicy: RETAIN` e não serão deletadas automaticamente.
