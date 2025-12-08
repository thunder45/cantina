import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';
import * as path from 'path';

interface CantinaStackProps extends cdk.StackProps {
  domainName: string;
  subDomain: string;
}

export class CantinaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: CantinaStackProps) {
    super(scope, id, props);

    const fullDomain = `${props.subDomain}.${props.domainName}`;
    const apiDomain = `api.${props.subDomain}.${props.domainName}`;

    // ========== DNS ==========
    // Import existing hosted zone (create manually first)
    const hostedZone = route53.HostedZone.fromLookup(this, 'HostedZone', {
      domainName: props.domainName,
    });

    // ========== SSL Certificate ==========
    // CloudFront requires certificate in us-east-1
    const certificate = new acm.DnsValidatedCertificate(this, 'Certificate', {
      domainName: fullDomain,
      subjectAlternativeNames: [apiDomain],
      hostedZone,
      region: 'us-east-1',
    });

    // Cast to ICertificate for CloudFront
    const cfCertificate = acm.Certificate.fromCertificateArn(
      this, 'CfCertificate', certificate.certificateArn
    );

    // ========== DynamoDB Tables ==========
    const categoriesTable = new dynamodb.Table(this, 'CategoriesTable', {
      tableName: 'cantina-categories',
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const eventsTable = new dynamodb.Table(this, 'EventsTable', {
      tableName: 'cantina-events',
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });
    eventsTable.addGlobalSecondaryIndex({
      indexName: 'categoryId-index',
      partitionKey: { name: 'categoryId', type: dynamodb.AttributeType.STRING },
    });

    const menuItemsTable = new dynamodb.Table(this, 'MenuItemsTable', {
      tableName: 'cantina-menu-items',
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });
    menuItemsTable.addGlobalSecondaryIndex({
      indexName: 'eventId-index',
      partitionKey: { name: 'eventId', type: dynamodb.AttributeType.STRING },
    });

    const ordersTable = new dynamodb.Table(this, 'OrdersTable', {
      tableName: 'cantina-orders',
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });
    ordersTable.addGlobalSecondaryIndex({
      indexName: 'eventId-index',
      partitionKey: { name: 'eventId', type: dynamodb.AttributeType.STRING },
    });

    const salesTable = new dynamodb.Table(this, 'SalesTable', {
      tableName: 'cantina-sales',
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });
    salesTable.addGlobalSecondaryIndex({
      indexName: 'eventId-index',
      partitionKey: { name: 'eventId', type: dynamodb.AttributeType.STRING },
    });

    const customersTable = new dynamodb.Table(this, 'CustomersTable', {
      tableName: 'cantina-customers',
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const menuGroupsTable = new dynamodb.Table(this, 'MenuGroupsTable', {
      tableName: 'cantina-menu-groups',
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const catalogItemsTable = new dynamodb.Table(this, 'CatalogItemsTable', {
      tableName: 'cantina-catalog-items',
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const sessionsTable = new dynamodb.Table(this, 'SessionsTable', {
      tableName: 'cantina-sessions',
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: 'ttl',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const auditLogsTable = new dynamodb.Table(this, 'AuditLogsTable', {
      tableName: 'cantina-audit-logs',
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });
    auditLogsTable.addGlobalSecondaryIndex({
      indexName: 'entityType-entityId-index',
      partitionKey: { name: 'entityType', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'entityId', type: dynamodb.AttributeType.STRING },
    });

    // ========== Secrets ==========
    const zohoSecret = secretsmanager.Secret.fromSecretNameV2(this, 'ZohoSecret', 'cantina/zoho-oauth');

    // ========== Lambda Backend ==========
    const backendLambda = new lambda.Function(this, 'BackendLambda', {
      functionName: 'cantina-api',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../backend/dist/lambda')),
      memorySize: 256,
      timeout: cdk.Duration.seconds(30),
      environment: {
        CATEGORIES_TABLE: categoriesTable.tableName,
        EVENTS_TABLE: eventsTable.tableName,
        MENU_ITEMS_TABLE: menuItemsTable.tableName,
        ORDERS_TABLE: ordersTable.tableName,
        SALES_TABLE: salesTable.tableName,
        CUSTOMERS_TABLE: customersTable.tableName,
        MENU_GROUPS_TABLE: menuGroupsTable.tableName,
        CATALOG_ITEMS_TABLE: catalogItemsTable.tableName,
        SESSIONS_TABLE: sessionsTable.tableName,
        AUDIT_LOGS_TABLE: auditLogsTable.tableName,
        CORS_ORIGIN: `https://${fullDomain}`,
        ZOHO_CLIENT_ID: '1000.GSSH23YGG1TFLSXYQG8EMLC54340GW',
        ZOHO_REDIRECT_URI: `https://${fullDomain}/api/auth/callback`,
        ZOHO_SECRET_ARN: zohoSecret.secretArn,
        SESSION_SECRET: process.env.SESSION_SECRET || 'cantina-session-secret-change-in-prod',
        ALLOWED_EMAIL_DOMAIN: 'advm.lu',
        FRONTEND_URL: `https://${fullDomain}`,
        NODE_ENV: 'production',
      },
    });

    // Grant DynamoDB permissions
    categoriesTable.grantReadWriteData(backendLambda);
    eventsTable.grantReadWriteData(backendLambda);
    menuItemsTable.grantReadWriteData(backendLambda);
    ordersTable.grantReadWriteData(backendLambda);
    salesTable.grantReadWriteData(backendLambda);
    customersTable.grantReadWriteData(backendLambda);
    menuGroupsTable.grantReadWriteData(backendLambda);
    catalogItemsTable.grantReadWriteData(backendLambda);
    sessionsTable.grantReadWriteData(backendLambda);
    auditLogsTable.grantReadWriteData(backendLambda);
    zohoSecret.grantRead(backendLambda);

    // ========== API Gateway ==========
    const api = new apigateway.RestApi(this, 'CantinaApi', {
      restApiName: 'cantina-api',
      defaultCorsPreflightOptions: {
        allowOrigins: [`https://${fullDomain}`, 'http://localhost:3000'],
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization', 'Cookie'],
        allowCredentials: true,
      },
    });

    // Proxy all requests to Lambda (auth handled by Lambda/Zoho OAuth)
    const lambdaIntegration = new apigateway.LambdaIntegration(backendLambda);
    api.root.addProxy({
      defaultIntegration: lambdaIntegration,
    });

    // ========== S3 + CloudFront (Frontend) ==========
    const websiteBucket = new s3.Bucket(this, 'WebsiteBucket', {
      bucketName: `cantina-frontend-${this.account}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // API Gateway origin for /api/* routes
    const apiOrigin = new origins.HttpOrigin(
      `${api.restApiId}.execute-api.${this.region}.amazonaws.com`,
      { originPath: '/prod' }
    );

    const distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(websiteBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      },
      additionalBehaviors: {
        '/api/*': {
          origin: apiOrigin,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
        },
      },
      domainNames: [fullDomain],
      certificate: cfCertificate,
      defaultRootObject: 'index.html',
      // Note: errorResponses removed - they were converting API 404s to index.html
      // SPA routing handled by React Router client-side
    });

    // DNS Records
    new route53.ARecord(this, 'SiteAliasRecord', {
      zone: hostedZone,
      recordName: props.subDomain,
      target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution)),
    });

    // ========== Outputs ==========
    new cdk.CfnOutput(this, 'WebsiteURL', { value: `https://${fullDomain}` });
    new cdk.CfnOutput(this, 'ApiURL', { value: api.url });
    new cdk.CfnOutput(this, 'BucketName', { value: websiteBucket.bucketName });
    new cdk.CfnOutput(this, 'DistributionId', { value: distribution.distributionId });
  }
}
