import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as iam from 'aws-cdk-lib/aws-iam';
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
    const eventsTable = new dynamodb.Table(this, 'EventsTable', {
      tableName: 'cantina-events',
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
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

    // ========== Cognito ==========
    const userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: 'cantina-users',
      selfSignUpEnabled: false, // Admin creates users
      signInAliases: { email: true },
      autoVerify: { email: true },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const userPoolClient = new cognito.UserPoolClient(this, 'UserPoolClient', {
      userPool,
      userPoolClientName: 'cantina-web',
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
      oAuth: {
        flows: { authorizationCodeGrant: true },
        scopes: [cognito.OAuthScope.OPENID, cognito.OAuthScope.EMAIL, cognito.OAuthScope.PROFILE],
        callbackUrls: [`https://${fullDomain}/callback`, 'http://localhost:3000/callback'],
        logoutUrls: [`https://${fullDomain}`, 'http://localhost:3000'],
      },
    });

    // ========== Lambda Backend ==========
    const backendLambda = new lambda.Function(this, 'BackendLambda', {
      functionName: 'cantina-api',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../backend/dist/lambda')),
      memorySize: 256,
      timeout: cdk.Duration.seconds(30),
      environment: {
        EVENTS_TABLE: eventsTable.tableName,
        MENU_ITEMS_TABLE: menuItemsTable.tableName,
        ORDERS_TABLE: ordersTable.tableName,
        SALES_TABLE: salesTable.tableName,
        CUSTOMERS_TABLE: customersTable.tableName,
        MENU_GROUPS_TABLE: menuGroupsTable.tableName,
        CATALOG_ITEMS_TABLE: catalogItemsTable.tableName,
        USER_POOL_ID: userPool.userPoolId,
        CORS_ORIGIN: `https://${fullDomain}`,
        // Zoho OAuth - set ZOHO_CLIENT_SECRET via AWS Console or CLI
        ZOHO_CLIENT_ID: '1000.GSSH23YGG1TFLSXYQG8EMLC54340GW',
        ZOHO_REDIRECT_URI: `https://${fullDomain}/api/auth/callback`,
        ZOHO_CLIENT_SECRET: process.env.ZOHO_CLIENT_SECRET || 'SET_VIA_CONSOLE',
        SESSION_SECRET: process.env.SESSION_SECRET || 'cantina-session-secret-change-in-prod',
        ALLOWED_EMAIL_DOMAIN: 'advm.lu',
        FRONTEND_URL: `https://${fullDomain}`,
        NODE_ENV: 'production',
      },
    });

    // Grant DynamoDB permissions
    eventsTable.grantReadWriteData(backendLambda);
    menuItemsTable.grantReadWriteData(backendLambda);
    ordersTable.grantReadWriteData(backendLambda);
    salesTable.grantReadWriteData(backendLambda);
    customersTable.grantReadWriteData(backendLambda);
    menuGroupsTable.grantReadWriteData(backendLambda);
    catalogItemsTable.grantReadWriteData(backendLambda);

    // ========== API Gateway ==========
    const api = new apigateway.RestApi(this, 'CantinaApi', {
      restApiName: 'cantina-api',
      defaultCorsPreflightOptions: {
        allowOrigins: [`https://${fullDomain}`, 'http://localhost:3000'],
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization'],
      },
    });

    const cognitoAuthorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'CognitoAuthorizer', {
      cognitoUserPools: [userPool],
    });

    // Proxy all requests to Lambda
    const lambdaIntegration = new apigateway.LambdaIntegration(backendLambda);
    api.root.addProxy({
      defaultIntegration: lambdaIntegration,
      defaultMethodOptions: {
        authorizer: cognitoAuthorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
      },
    });

    // ========== S3 + CloudFront (Frontend) ==========
    const websiteBucket = new s3.Bucket(this, 'WebsiteBucket', {
      bucketName: `cantina-frontend-${this.account}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(websiteBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      },
      domainNames: [fullDomain],
      certificate: cfCertificate,
      defaultRootObject: 'index.html',
      errorResponses: [
        { httpStatus: 404, responseHttpStatus: 200, responsePagePath: '/index.html' },
        { httpStatus: 403, responseHttpStatus: 200, responsePagePath: '/index.html' },
      ],
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
    new cdk.CfnOutput(this, 'UserPoolId', { value: userPool.userPoolId });
    new cdk.CfnOutput(this, 'UserPoolClientId', { value: userPoolClient.userPoolClientId });
    new cdk.CfnOutput(this, 'BucketName', { value: websiteBucket.bucketName });
    new cdk.CfnOutput(this, 'DistributionId', { value: distribution.distributionId });
  }
}
