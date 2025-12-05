#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CantinaStack } from '../src/cantina-stack';

const app = new cdk.App();

const domainName = app.node.tryGetContext('domainName') || 'advm.lu';
const subDomain = app.node.tryGetContext('subDomain') || 'cantina';
const awsRegion = app.node.tryGetContext('awsRegion') || 'eu-west-1';

new CantinaStack(app, 'CantinaStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: awsRegion,
  },
  domainName,
  subDomain,
});
