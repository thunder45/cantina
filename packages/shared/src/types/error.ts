/**
 * ErrorResponse - Formato padrão de resposta de erro
 */
export interface ErrorResponse {
  code: string;
  message: string;
  details?: Record<string, string>;
}

/**
 * Error Codes - Códigos de erro do sistema
 */
export const ErrorCodes = {
  ERR_STOCK_INSUFFICIENT: 'Estoque insuficiente para a quantidade solicitada',
  ERR_DUPLICATE_NAME: 'Já existe um registro com este nome',
  ERR_INVALID_PRICE: 'O preço deve ser maior que zero',
  ERR_EMPTY_NAME: 'O nome não pode estar vazio',
  ERR_INVALID_QUANTITY: 'A quantidade deve ser maior que zero',
  ERR_SALE_ALREADY_REFUNDED: 'Esta venda já foi estornada',
  ERR_GROUP_HAS_ITEMS: 'Não é possível excluir grupo com itens associados',
  ERR_EVENT_NOT_FOUND: 'Evento não encontrado',
  ERR_CUSTOMER_NOT_FOUND: 'Cliente não encontrado',
  ERR_PAYMENT_MISMATCH: 'Soma dos pagamentos não corresponde ao total',
} as const;

export type ErrorCode = keyof typeof ErrorCodes;
