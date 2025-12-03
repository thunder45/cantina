/**
 * MenuGroup - Categoria de itens (ex: Refeição, Bebida, Sobremesa)
 */
export interface MenuGroup {
  id: string;
  name: string;
  order: number;
  isDefault: boolean;
}

/**
 * CatalogItem - Item predefinido disponível para seleção ao montar um menu
 */
export interface CatalogItem {
  id: string;
  description: string;
  suggestedPrice: number;
  groupId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string; // Soft delete
}

export interface CreateCatalogItemInput {
  description: string;
  suggestedPrice: number;
  groupId: string;
}

export interface UpdateCatalogItemInput {
  description?: string;
  suggestedPrice?: number;
  groupId?: string;
}

/**
 * MenuItem - Produto disponível para venda com descrição, preço e quantidade em estoque
 * Note: description and price are snapshots taken when item is added to menu.
 * Changes to catalog item do NOT affect existing menu items.
 */
export interface MenuItem {
  id: string;
  eventId: string;
  catalogItemId: string;
  description: string;     // Snapshot at menu creation
  price: number;           // Snapshot - can differ from catalog suggestedPrice
  stock: number;           // 0 = infinite
  soldCount: number;
  groupId: string;
}

export interface AddMenuItemInput {
  catalogItemId: string;
  description: string;
  price: number;
  stock: number;
  groupId: string;
}

export interface UpdateMenuItemInput {
  price?: number;
  stock?: number;
}
