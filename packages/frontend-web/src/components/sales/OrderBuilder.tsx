import React, { useState, useEffect, useCallback } from 'react';
import {
  Event,
  MenuItem,
  MenuGroup,
  Order,
  OrderItem,
  ApiClient,
  MenuGroupApiService,
  MenuItemApiService,
  OrderApiService,
  Colors,
  Spacing,
  FontSizes,
  BorderRadius,
} from '@cantina-pos/shared';
import { MenuItemGrid } from './MenuItemGrid';
import { OrderSummary } from './OrderSummary';
import { usePlatform, useKeyboardShortcuts, KeyboardShortcut } from '../../hooks';
import { getResponsiveLayoutStyles, getResponsivePanelWidth, getResponsiveFontSize } from '../../styles';

interface OrderBuilderProps {
  apiClient: ApiClient;
  event: Event;
  onCheckout: (order: Order) => void;
  onBack: () => void;
}

export const OrderBuilder: React.FC<OrderBuilderProps> = ({
  apiClient,
  event,
  onCheckout,
  onBack,
}) => {
  const [groups, setGroups] = useState<MenuGroup[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [orderLoading, setOrderLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showOrderPanel, setShowOrderPanel] = useState(true);

  // Platform detection for responsive layout
  const { platform, orientation, isTouch } = usePlatform();
  const styleOptions = { platform, orientation, isTouch };

  const groupService = new MenuGroupApiService(apiClient);
  const menuItemService = new MenuItemApiService(apiClient);
  const orderService = new OrderApiService(apiClient);

  // Keyboard shortcuts for desktop
  const shortcuts: KeyboardShortcut[] = [
    { key: 'Escape', description: 'Clear order', action: () => handleClearOrder() },
    { key: 'Enter', ctrl: true, description: 'Checkout', action: () => handleCheckout() },
    { key: 'o', description: 'Toggle order panel', action: () => setShowOrderPanel(prev => !prev) },
  ];
  useKeyboardShortcuts(shortcuts, platform === 'desktop');

  // Load menu data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [groupsData, itemsData] = await Promise.all([
        groupService.getGroups(),
        menuItemService.getMenuItems(event.id),
      ]);
      setGroups(groupsData.sort((a, b) => a.order - b.order));
      setMenuItems(itemsData);
    } catch (err) {
      setError('Erro ao carregar dados do menu');
      console.error('Failed to load menu data:', err);
    } finally {
      setLoading(false);
    }
  }, [event.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Calculate available stock for an item (considering current order)
  const getAvailableStock = useCallback((item: MenuItem): number => {
    if (item.stock === 0) return Infinity; // Infinite stock
    const orderItem = orderItems.find(oi => oi.menuItemId === item.id);
    const inOrder = orderItem?.quantity || 0;
    return Math.max(0, item.stock - item.soldCount - inOrder);
  }, [orderItems]);

  // Calculate order total
  const calculateTotal = useCallback((): number => {
    return orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [orderItems]);

  // Create order if not exists
  const ensureOrder = useCallback(async (): Promise<Order> => {
    if (currentOrder) return currentOrder;
    const order = await orderService.createOrder(event.id);
    setCurrentOrder(order);
    return order;
  }, [currentOrder, event.id]);

  // Add item to order
  const handleAddItem = useCallback(async (menuItem: MenuItem) => {
    try {
      setOrderLoading(true);
      setError(null);

      // Check stock availability
      const available = getAvailableStock(menuItem);
      if (available <= 0 && menuItem.stock !== 0) {
        setError('Item esgotado');
        return;
      }

      const order = await ensureOrder();
      const existingItem = orderItems.find(item => item.menuItemId === menuItem.id);
      const newQuantity = (existingItem?.quantity || 0) + 1;

      // Enforce stock limit (Requirement 6.4)
      const maxQuantity = menuItem.stock === 0 
        ? newQuantity 
        : Math.min(newQuantity, menuItem.stock - menuItem.soldCount);

      if (maxQuantity < newQuantity && menuItem.stock !== 0) {
        setError(`Quantidade limitada ao estoque disponível: ${maxQuantity}`);
      }

      // Update order on backend
      const updatedOrder = await orderService.addOrUpdateOrderItem(
        order.id,
        menuItem.id,
        maxQuantity
      );
      setCurrentOrder(updatedOrder);

      // Update local state
      if (existingItem) {
        setOrderItems(items =>
          items.map(item =>
            item.menuItemId === menuItem.id
              ? { ...item, quantity: maxQuantity }
              : item
          )
        );
      } else {
        setOrderItems(items => [
          ...items,
          {
            menuItemId: menuItem.id,
            description: menuItem.description,
            price: menuItem.price,
            quantity: maxQuantity,
          },
        ]);
      }

      // On mobile, show order panel when item is added
      if (platform === 'mobile' && !showOrderPanel) {
        setShowOrderPanel(true);
      }
    } catch (err) {
      setError('Erro ao adicionar item');
      console.error('Failed to add item:', err);
    } finally {
      setOrderLoading(false);
    }
  }, [orderItems, ensureOrder, getAvailableStock, platform, showOrderPanel]);

  // Update item quantity
  const handleUpdateQuantity = useCallback(async (menuItemId: string, quantity: number) => {
    if (!currentOrder) return;

    try {
      setOrderLoading(true);
      setError(null);

      if (quantity <= 0) {
        // Remove item
        await orderService.removeOrderItem(currentOrder.id, menuItemId);
        setOrderItems(items => items.filter(item => item.menuItemId !== menuItemId));
      } else {
        // Check stock limit
        const menuItem = menuItems.find(mi => mi.id === menuItemId);
        if (menuItem && menuItem.stock !== 0) {
          const maxQuantity = menuItem.stock - menuItem.soldCount;
          if (quantity > maxQuantity) {
            setError(`Quantidade limitada ao estoque disponível: ${maxQuantity}`);
            quantity = maxQuantity;
          }
        }

        const updatedOrder = await orderService.addOrUpdateOrderItem(
          currentOrder.id,
          menuItemId,
          quantity
        );
        setCurrentOrder(updatedOrder);
        setOrderItems(items =>
          items.map(item =>
            item.menuItemId === menuItemId
              ? { ...item, quantity }
              : item
          )
        );
      }
    } catch (err) {
      setError('Erro ao atualizar quantidade');
      console.error('Failed to update quantity:', err);
    } finally {
      setOrderLoading(false);
    }
  }, [currentOrder, menuItems]);

  // Remove item from order
  const handleRemoveItem = useCallback(async (menuItemId: string) => {
    if (!currentOrder) return;

    try {
      setOrderLoading(true);
      setError(null);
      await orderService.removeOrderItem(currentOrder.id, menuItemId);
      setOrderItems(items => items.filter(item => item.menuItemId !== menuItemId));
    } catch (err) {
      setError('Erro ao remover item');
      console.error('Failed to remove item:', err);
    } finally {
      setOrderLoading(false);
    }
  }, [currentOrder]);

  // Clear/cancel order (Requirement 13.1, 13.2, 13.3)
  const handleClearOrder = useCallback(async () => {
    if (!currentOrder) {
      setOrderItems([]);
      return;
    }

    try {
      setOrderLoading(true);
      setError(null);
      await orderService.cancelOrder(currentOrder.id);
      setCurrentOrder(null);
      setOrderItems([]);
    } catch (err) {
      setError('Erro ao cancelar pedido');
      console.error('Failed to cancel order:', err);
    } finally {
      setOrderLoading(false);
    }
  }, [currentOrder]);

  // Proceed to checkout
  const handleCheckout = useCallback(() => {
    if (!currentOrder || orderItems.length === 0) return;
    
    // Update order with current items and total
    const orderWithItems: Order = {
      ...currentOrder,
      items: orderItems,
      total: calculateTotal(),
    };
    onCheckout(orderWithItems);
  }, [currentOrder, orderItems, calculateTotal, onCheckout]);

  // Responsive layout styles
  const layoutStyles = getResponsiveLayoutStyles(styleOptions);
  const panelWidth = getResponsivePanelWidth(styleOptions);

  // On mobile, use a bottom sheet style for order panel
  const isMobileLayout = platform === 'mobile' || (platform === 'tablet' && orientation === 'portrait');

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100%',
        color: Colors.textSecondary,
        fontSize: getResponsiveFontSize(styleOptions, 'md'),
      }}>
        A carregar menu...
      </div>
    );
  }

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%',
      backgroundColor: Colors.backgroundSecondary,
    }}>
      {/* Error Banner */}
      {error && (
        <div style={{
          padding: Spacing.sm,
          backgroundColor: Colors.danger,
          color: Colors.textLight,
          textAlign: 'center',
          fontSize: getResponsiveFontSize(styleOptions, 'sm'),
        }}>
          {error}
          <button
            onClick={() => setError(null)}
            style={{
              marginLeft: Spacing.md,
              background: 'none',
              border: 'none',
              color: Colors.textLight,
              cursor: isTouch ? 'default' : 'pointer',
              textDecoration: 'underline',
              padding: Spacing.sm,
            }}
          >
            Fechar
          </button>
        </div>
      )}

      {/* Main Content - Responsive Layout */}
      <div style={{ 
        ...layoutStyles,
        flex: 1, 
        overflow: 'hidden',
      }}>
        {/* Menu Items Grid */}
        <div style={{ 
          flex: 1, 
          overflow: 'hidden',
          // On mobile with order panel open, reduce height
          height: isMobileLayout && showOrderPanel ? '50%' : '100%',
        }}>
          <MenuItemGrid
            menuItems={menuItems}
            groups={groups}
            selectedGroupId={selectedGroupId}
            onSelectGroup={setSelectedGroupId}
            onAddItem={handleAddItem}
            getAvailableStock={getAvailableStock}
          />
        </div>

        {/* Order Summary - Side panel on landscape tablet/desktop, bottom panel on mobile */}
        {(showOrderPanel || !isMobileLayout) && (
          <div style={{ 
            width: isMobileLayout ? '100%' : panelWidth, 
            height: isMobileLayout ? '50%' : '100%',
            flexShrink: 0,
            position: isMobileLayout ? 'relative' : 'static',
          }}>
            <OrderSummary
              items={orderItems}
              total={calculateTotal()}
              onUpdateQuantity={handleUpdateQuantity}
              onRemoveItem={handleRemoveItem}
              onClearOrder={handleClearOrder}
              onCheckout={handleCheckout}
              loading={orderLoading}
            />
          </div>
        )}
      </div>

      {/* Mobile: Floating button to show order when hidden */}
      {isMobileLayout && !showOrderPanel && orderItems.length > 0 && (
        <button
          onClick={() => setShowOrderPanel(true)}
          style={{
            position: 'fixed',
            bottom: Spacing.lg,
            right: Spacing.lg,
            padding: `${Spacing.md}px ${Spacing.lg}px`,
            backgroundColor: Colors.primary,
            color: Colors.textLight,
            border: 'none',
            borderRadius: BorderRadius.full,
            fontSize: getResponsiveFontSize(styleOptions, 'md'),
            fontWeight: 600,
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            cursor: isTouch ? 'default' : 'pointer',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            gap: Spacing.sm,
          }}
        >
          🛒 {orderItems.length} • €{calculateTotal().toFixed(2)}
        </button>
      )}

      {/* Mobile: Toggle button to hide order panel */}
      {isMobileLayout && showOrderPanel && (
        <button
          onClick={() => setShowOrderPanel(false)}
          style={{
            position: 'absolute',
            top: isMobileLayout ? '50%' : Spacing.md,
            left: '50%',
            transform: 'translate(-50%, -100%)',
            padding: `${Spacing.xs}px ${Spacing.md}px`,
            backgroundColor: Colors.background,
            color: Colors.textSecondary,
            border: `1px solid ${Colors.border}`,
            borderRadius: BorderRadius.full,
            fontSize: FontSizes.sm,
            cursor: isTouch ? 'default' : 'pointer',
            zIndex: 101,
          }}
        >
          ▼ Esconder pedido
        </button>
      )}
    </div>
  );
};
