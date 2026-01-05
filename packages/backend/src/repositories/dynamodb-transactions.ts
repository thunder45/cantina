import { DynamoDBDocumentClient, TransactWriteCommand, TransactWriteCommandInput } from '@aws-sdk/lib-dynamodb';

const BATCH_SIZE = 20; // Limite de 25, usamos 20 para folga

export interface TransactItem {
  Put?: {
    TableName: string;
    Item: Record<string, any>;
  };
  Update?: {
    TableName: string;
    Key: Record<string, any>;
    UpdateExpression: string;
    ExpressionAttributeValues: Record<string, any>;
  };
  Delete?: {
    TableName: string;
    Key: Record<string, any>;
  };
}

/**
 * Executa transação atômica com até 20 items.
 * Para operações críticas que não podem falhar parcialmente.
 */
export async function executeTransaction(
  docClient: DynamoDBDocumentClient,
  items: TransactItem[]
): Promise<void> {
  if (items.length === 0) return;
  if (items.length > BATCH_SIZE) {
    throw new Error(`Transaction exceeds batch size: ${items.length} > ${BATCH_SIZE}`);
  }

  await docClient.send(new TransactWriteCommand({
    TransactItems: items as TransactWriteCommandInput['TransactItems'],
  }));
}

/**
 * Executa transações em batches de 20.
 * Retorna lista de batches que falharam (índice do batch).
 * ATENÇÃO: Não é atômico entre batches!
 */
export async function executeTransactionBatches(
  docClient: DynamoDBDocumentClient,
  items: TransactItem[]
): Promise<{ success: boolean; failedBatches: number[]; error?: Error }> {
  if (items.length === 0) return { success: true, failedBatches: [] };

  const batches: TransactItem[][] = [];
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    batches.push(items.slice(i, i + BATCH_SIZE));
  }

  const failedBatches: number[] = [];
  let lastError: Error | undefined;

  for (let i = 0; i < batches.length; i++) {
    try {
      await executeTransaction(docClient, batches[i]);
    } catch (err) {
      failedBatches.push(i);
      lastError = err as Error;
      // Continua tentando os próximos batches
    }
  }

  return {
    success: failedBatches.length === 0,
    failedBatches,
    error: lastError,
  };
}
