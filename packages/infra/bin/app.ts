#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CantinaStack } from '../src/cantina-stack';

const app = new cdk.App();

const domainName = app.node.tryGetContext('domainName') || 'advm.lu';
const subDomain = app.node.tryGetContext('subDomain') || 'cantina';

new CantinaStack(app, 'CantinaStack', {
  env: {
    account: '625272706584',
    region: 'eu-west-1',
  },
  domainName,
  subDomain,
});
