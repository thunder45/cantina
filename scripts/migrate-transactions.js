#!/usr/bin/env node
/**
 * Script de migração: Move transações da tabela customers para customer-transactions
 * 
 * Uso:
 *   node scripts/migrate-transactions.js --env beta --dry-run
 *   node scripts/migrate-transactions.js --env beta
 *   node scripts/migrate-transactions.js --env prod
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, PutCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');

const args = process.argv.slice(2);
const envArg = args.find(a => a.startsWith('--env='))?.split('=')[1] || args[args.indexOf('--env') + 1];
const dryRun = args.includes('--dry-run');

if (!envArg || !['beta', 'prod'].includes(envArg)) {
  console.error('Usage: node migrate-transactions.js --env <beta|prod> [--dry-run]');
  process.exit(1);
}

const prefix = envArg === 'prod' ? '' : 'beta-';
const CUSTOMERS_TABLE = `${prefix}cantina-customers`;
const TRANSACTIONS_TABLE = `${prefix}cantina-customer-transactions`;

const client = new DynamoDBClient({ 
  region: 'eu-west-1',
  // Use cantina profile
  credentials: require('@aws-sdk/credential-provider-ini').fromIni({ profile: 'cantina' }),
});
const docClient = DynamoDBDocumentClient.from(client);

async function migrate() {
  console.log(`\n🔄 Migrating transactions from ${CUSTOMERS_TABLE} to ${TRANSACTIONS_TABLE}`);
  console.log(`   Mode: ${dryRun ? 'DRY RUN (no changes)' : 'LIVE'}\n`);

  // 1. Scan all items from customers table
  console.log('📖 Scanning customers table...');
  const scanResult = await docClient.send(new ScanCommand({ TableName: CUSTOMERS_TABLE }));
  const items = scanResult.Items || [];
  
  // 2. Separate customers from transactions
  const transactions = items.filter(item => item.id?.startsWith('tx#'));
  const customers = items.filter(item => !item.id?.startsWith('tx#'));
  
  console.log(`   Found ${customers.length} customers`);
  console.log(`   Found ${transactions.length} transactions to migrate\n`);

  if (transactions.length === 0) {
    console.log('✅ No transactions to migrate!');
    return;
  }

  // 3. Migrate each transaction
  let migrated = 0;
  let errors = 0;

  for (const tx of transactions) {
    const newTx = {
      ...tx,
      id: tx.id.replace('tx#', ''), // Remove tx# prefix
      customerId: tx.pk || tx.customerId, // Use pk as customerId
    };
    delete newTx.pk; // Remove old pk field

    if (dryRun) {
      console.log(`   [DRY] Would migrate: ${tx.id} -> ${newTx.id} (customer: ${newTx.customerId})`);
      migrated++;
    } else {
      try {
        // Insert into new table
        await docClient.send(new PutCommand({
          TableName: TRANSACTIONS_TABLE,
          Item: newTx,
        }));
        
        // Delete from old table
        await docClient.send(new DeleteCommand({
          TableName: CUSTOMERS_TABLE,
          Key: { id: tx.id },
        }));
        
        console.log(`   ✓ Migrated: ${tx.id} -> ${newTx.id}`);
        migrated++;
      } catch (err) {
        console.error(`   ✗ Error migrating ${tx.id}: ${err.message}`);
        errors++;
      }
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Migrated: ${migrated}`);
  console.log(`   Errors: ${errors}`);
  
  if (dryRun) {
    console.log(`\n⚠️  This was a dry run. Run without --dry-run to apply changes.`);
  } else {
    console.log(`\n✅ Migration complete!`);
  }
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
