import React, { useState, useEffect } from 'react';
import { Event, MenuGroup, MenuItem, CatalogItem, AddMenuItemInput, CreateCatalogItemInput } from '@cantina-pos/shared';
import { MenuGroupApiService, MenuItemApiService, CatalogApiService, ApiClient } from '@cantina-pos/shared';
import { Colors, Spacing, FontSizes, BorderRadius, getModalStyles } from '@cantina-pos/shared';
import { MenuGroupList, MenuItemCard } from '../components/menu';
import { CatalogBrowser, AddMenuItemForm, CreateCatalogItemForm } from '../components/catalog';

interface MenuPageProps {
  apiClient: ApiClient;
  event: Event;
  onStartSales: () => void;
}

export const MenuPage: React.FC<MenuPageProps> = ({
  apiClient,
  event,
  onStartSales,
}) => {
  const [groups, setGroups] = useState<MenuGroup[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal states
  const [showCatalogBrowser, setShowCatalogBrowser] = useState(false);
  const [selectedCatalogItem, setSelectedCatalogItem] = useState<CatalogItem | null>(null);
  const [showCreateCatalogItem, setShowCreateCatalogItem] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  const groupService = new MenuGroupApiService(apiClient);
  const menuItemService = new MenuItemApiService(apiClient);
  const catalogService = new CatalogApiService(apiClient);
  const modalStyles = getModalStyles();

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [groupsData, itemsData, catalogData] = await Promise.all([
        groupService.getGroups(),
        menuItemService.getMenuItems(event.id),
        catalogService.getCatalogItems(),
      ]);
      setGroups(groupsData.sort((a, b) => a.order - b.order));
      setMenuItems(itemsData);
      setCatalogItems(catalogData);
    } catch (err) {
      setError('Erro ao carregar dados do menu');
      console.error('Failed to load menu data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [event.id]);

  const handleAddGroup = async (name: string) => {
    try {
      const newGroup = await groupService.createGroup(name);
      setGroups([...groups, newGroup].sort((a, b) => a.order - b.order));
    } catch (err) {
      setError('Erro ao criar grupo');
      console.error('Failed to create group:', err);
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    const hasItems = menuItems.some(item => item.groupId === groupId);
    if (hasItems) {
      setError('Não é possível excluir grupo com itens associados');
      return;
    }
    try {
      await groupService.deleteGroup(groupId);
      setGroups(groups.filter(g => g.id !== groupId));
      if (selectedGroupId === groupId) {
        setSelectedGroupId(null);
      }
    } catch (err) {
      setError('Erro ao excluir grupo');
      console.error('Failed to delete group:', err);
    }
  };

  const handleEditItem = (item: MenuItem) => {
    // TODO: Open edit modal
    console.log('Edit item:', item);
  };

  const handleRemoveItem = async (itemId: string) => {
    try {
      await menuItemService.removeMenuItem(itemId);
      setMenuItems(menuItems.filter(i => i.id !== itemId));
    } catch (err) {
      setError('Erro ao remover item do menu');
      console.error('Failed to remove menu item:', err);
    }
  };

  const handleSelectCatalogItem = (item: CatalogItem) => {
    setSelectedCatalogItem(item);
    setShowCatalogBrowser(false);
  };

  const handleAddMenuItem = async (data: AddMenuItemInput) => {
    try {
      setFormLoading(true);
      const newItem = await menuItemService.addMenuItem(event.id, {
        ...data,
        eventId: event.id,
      } as Omit<MenuItem, 'id' | 'soldCount'>);
      setMenuItems([...menuItems, newItem]);
      setSelectedCatalogItem(null);
    } catch (err) {
      setError('Erro ao adicionar item ao menu');
      console.error('Failed to add menu item:', err);
    } finally {
      setFormLoading(false);
    }
  };

  const handleCreateCatalogItem = async (data: CreateCatalogItemInput) => {
    try {
      setFormLoading(true);
      // Backend initializes version automatically
      const newItem = await catalogService.createCatalogItem(data);
      setCatalogItems([...catalogItems, newItem]);
      setShowCreateCatalogItem(false);
      // Automatically select the new item to add to menu
      setSelectedCatalogItem(newItem);
    } catch (err) {
      setError('Erro ao criar item no catálogo');
      console.error('Failed to create catalog item:', err);
    } finally {
      setFormLoading(false);
    }
  };

  const filteredItems = selectedGroupId
    ? menuItems.filter(item => item.groupId === selectedGroupId)
    : menuItems;

  const getGroupName = (groupId: string): string => {
    const group = groups.find(g => g.id === groupId);
    return group?.name || 'Sem grupo';
  };

  if (loading) {
    return (
      <div style={{ padding: Spacing.xl, textAlign: 'center' }}>
        <p style={{ color: Colors.textSecondary }}>A carregar menu...</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: Colors.backgroundSecondary }}>
      {/* Error Banner */}
      {error && (
        <div style={{
          padding: Spacing.md,
          backgroundColor: Colors.danger,
          color: Colors.textLight,
          textAlign: 'center',
        }}>
          {error}
          <button
            onClick={() => setError(null)}
            style={{
              marginLeft: Spacing.md,
              background: 'none',
              border: 'none',
              color: Colors.textLight,
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            Fechar
          </button>
        </div>
      )}

      <div style={{ padding: Spacing.md }}>
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: Spacing.lg,
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: FontSizes.xl, fontWeight: 600, color: Colors.text }}>
              Menu - {event.name}
            </h1>
            <p style={{ margin: 0, marginTop: Spacing.xs, color: Colors.textSecondary }}>
              {menuItems.length} itens no menu
            </p>
          </div>
          <div style={{ display: 'flex', gap: Spacing.sm }}>
            <button
              onClick={() => setShowCatalogBrowser(true)}
              style={{
                padding: `${Spacing.sm}px ${Spacing.md}px`,
                backgroundColor: Colors.secondary,
                color: Colors.textLight,
                border: 'none',
                borderRadius: BorderRadius.md,
                fontSize: FontSizes.md,
                cursor: 'pointer',
              }}
            >
              + Adicionar Item
            </button>
            <button
              onClick={onStartSales}
              disabled={menuItems.length === 0}
              style={{
                padding: `${Spacing.sm}px ${Spacing.md}px`,
                backgroundColor: menuItems.length === 0 ? Colors.secondary : Colors.success,
                color: Colors.textLight,
                border: 'none',
                borderRadius: BorderRadius.md,
                fontSize: FontSizes.md,
                fontWeight: 600,
                cursor: menuItems.length === 0 ? 'not-allowed' : 'pointer',
                opacity: menuItems.length === 0 ? 0.6 : 1,
              }}
            >
              Iniciar Vendas
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div style={{ display: 'flex', gap: Spacing.lg }}>
          {/* Sidebar - Groups */}
          <div style={{ width: 250, flexShrink: 0 }}>
            <MenuGroupList
              groups={groups}
              selectedGroupId={selectedGroupId}
              onSelectGroup={setSelectedGroupId}
              onAddGroup={handleAddGroup}
              onDeleteGroup={handleDeleteGroup}
              loading={loading}
            />
          </div>

          {/* Main - Menu Items */}
          <div style={{ flex: 1 }}>
            {filteredItems.length === 0 ? (
              <div style={{
                backgroundColor: Colors.background,
                borderRadius: BorderRadius.lg,
                border: `1px solid ${Colors.border}`,
                padding: Spacing.xl,
                textAlign: 'center',
              }}>
                <p style={{ color: Colors.textSecondary, margin: 0 }}>
                  {selectedGroupId 
                    ? 'Nenhum item neste grupo' 
                    : 'Nenhum item no menu. Adicione itens do catálogo.'}
                </p>
              </div>
            ) : (
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: Spacing.md,
              }}>
                {filteredItems.map((item) => (
                  <div key={item.id}>
                    {!selectedGroupId && (
                      <p style={{ 
                        margin: 0, 
                        marginBottom: Spacing.xs, 
                        fontSize: FontSizes.xs, 
                        color: Colors.textSecondary,
                      }}>
                        {getGroupName(item.groupId)}
                      </p>
                    )}
                    <MenuItemCard
                      item={item}
                      onEdit={handleEditItem}
                      onRemove={handleRemoveItem}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Catalog Browser Modal */}
      {showCatalogBrowser && (
        <div style={modalStyles.overlay} onClick={() => setShowCatalogBrowser(false)}>
          <div
            style={{ ...modalStyles.container, maxWidth: 600, maxHeight: '80vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={modalStyles.header}>
              <h3 style={modalStyles.title}>Selecionar do Catálogo</h3>
              <button
                onClick={() => setShowCatalogBrowser(false)}
                style={modalStyles.closeButton}
              >
                ×
              </button>
            </div>
            <div style={{ ...modalStyles.content, height: 400 }}>
              <CatalogBrowser
                catalogItems={catalogItems}
                groups={groups}
                onSelectItem={handleSelectCatalogItem}
                onCreateItem={() => {
                  setShowCatalogBrowser(false);
                  setShowCreateCatalogItem(true);
                }}
                loading={loading}
              />
            </div>
          </div>
        </div>
      )}

      {/* Add Menu Item Modal */}
      {selectedCatalogItem && (
        <div style={modalStyles.overlay} onClick={() => setSelectedCatalogItem(null)}>
          <div
            style={modalStyles.container}
            onClick={(e) => e.stopPropagation()}
          >
            <AddMenuItemForm
              catalogItem={selectedCatalogItem}
              groups={groups}
              onSubmit={handleAddMenuItem}
              onCancel={() => setSelectedCatalogItem(null)}
              loading={formLoading}
            />
          </div>
        </div>
      )}

      {/* Create Catalog Item Modal */}
      {showCreateCatalogItem && (
        <div style={modalStyles.overlay} onClick={() => setShowCreateCatalogItem(false)}>
          <div
            style={modalStyles.container}
            onClick={(e) => e.stopPropagation()}
          >
            <CreateCatalogItemForm
              groups={groups}
              onSubmit={handleCreateCatalogItem}
              onCancel={() => setShowCreateCatalogItem(false)}
              loading={formLoading}
            />
          </div>
        </div>
      )}
    </div>
  );
};
