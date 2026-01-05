#!/usr/bin/env node
/**
 * Migration script to add yearMonth field to existing sales for GSI
 * Usage: node scripts/add-yearmonth-to-sales.js --env beta [--dry-run]
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

const args = process.argv.slice(2);
const envArg = args.find(a => a.startsWith('--env=')) || args[args.indexOf('--env') + 1];
const env = envArg?.replace('--env=', '') || 'beta';
const dryRun = args.includes('--dry-run');

if (!['beta', 'prod'].includes(env)) {
  console.error('Usage: node add-yearmonth-to-sales.js --env beta|prod [--dry-run]');
  process.exit(1);
}

const TABLE_NAME = env === 'prod' ? 'cantina-sales' : 'beta-cantina-sales';

const client = new DynamoDBClient({ region: 'eu-west-1', profile: 'cantina' });
const docClient = DynamoDBDocumentClient.from(client);

async function migrate() {
  console.log(`\n🔄 Migrating sales in ${TABLE_NAME}${dryRun ? ' (DRY RUN)' : ''}\n`);

  // Scan all sales
  const result = await docClient.send(new ScanCommand({ TableName: TABLE_NAME }));
  const sales = result.Items || [];
  
  console.log(`Found ${sales.length} sales`);
  
  const toUpdate = sales.filter(s => !s.yearMonth);
  console.log(`${toUpdate.length} sales need yearMonth field\n`);

  if (toUpdate.length === 0) {
    console.log('✅ All sales already have yearMonth');
    return;
  }

  let updated = 0;
  for (const sale of toUpdate) {
    const yearMonth = sale.createdAt.substring(0, 7);
    
    if (dryRun) {
      console.log(`Would update ${sale.id}: yearMonth = ${yearMonth}`);
    } else {
      await docClient.send(new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { id: sale.id },
        UpdateExpression: 'SET yearMonth = :ym',
        ExpressionAttributeValues: { ':ym': yearMonth },
      }));
      updated++;
      if (updated % 10 === 0) console.log(`Updated ${updated}/${toUpdate.length}`);
    }
  }

  console.log(`\n✅ ${dryRun ? 'Would update' : 'Updated'} ${toUpdate.length} sales`);
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
