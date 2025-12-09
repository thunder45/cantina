import React, { useState, useEffect, useCallback } from 'react';
import { Event, EventCategory, CreateEventInput } from '@cantina-pos/shared';
import { EventApiService, EventCategoryApiService, ApiClient, ReportApiService } from '@cantina-pos/shared';
import { Colors, Spacing, getModalStyles, FontSizes, BorderRadius } from '@cantina-pos/shared';
import { EventList, EventForm, CategoryList, CategoryForm } from '../components/events';
import { CategoryReportView } from '../components/reports';

type ViewMode = 'categories' | 'events' | 'category-events';

interface EventsPageProps {
  apiClient: ApiClient;
  onEventSelect: (event: Event) => void;
}

export const EventsPage: React.FC<EventsPageProps> = ({
  apiClient,
  onEventSelect,
}) => {
  // State
  const [viewMode, setViewMode] = useState<ViewMode>('categories');
  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [eventCounts, setEventCounts] = useState<Record<string, number>>({});
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<EventCategory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal states
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<EventCategory | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<EventCategory | null>(null);
  const [reportCategory, setReportCategory] = useState<EventCategory | null>(null);
  const [exporting, setExporting] = useState(false);

  const eventService = new EventApiService(apiClient);
  const categoryService = new EventCategoryApiService(apiClient);
  const reportService = new ReportApiService(apiClient);
  const modalStyles = getModalStyles();

  // Load categories
  const loadCategories = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await categoryService.getCategories();
      setCategories(data);
      
      // Load event counts for each category
      const counts: Record<string, number> = {};
      await Promise.all(
        data.map(async (cat) => {
          try {
            const catEvents = await categoryService.getCategoryEvents(cat.id);
            counts[cat.id] = catEvents.length;
          } catch {
            counts[cat.id] = 0;
          }
        })
      );
      setEventCounts(counts);
    } catch (err) {
      setError('Erro ao carregar categorias. Tente novamente.');
      console.error('Failed to load categories:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load events for a category
  const loadCategoryEvents = useCallback(async (categoryId: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await categoryService.getCategoryEvents(categoryId);
      setEvents(data.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ));
    } catch (err) {
      setError('Erro ao carregar eventos. Tente novamente.');
      console.error('Failed to load events:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load all events
  const loadAllEvents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await eventService.getEvents();
      setEvents(data.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ));
    } catch (err) {
      setError('Erro ao carregar eventos. Tente novamente.');
      console.error('Failed to load events:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // Category handlers
  const handleCategorySelect = (category: EventCategory) => {
    setSelectedCategory(category);
    setViewMode('category-events');
    loadCategoryEvents(category.id);
  };

  const handleCreateCategory = async (name: string) => {
    try {
      setFormLoading(true);
      setError(null);
      const newCategory = await categoryService.createCategory({ name });
      setCategories([...categories, newCategory]);
      setEventCounts({ ...eventCounts, [newCategory.id]: 0 });
      setShowCategoryForm(false);
    } catch (err) {
      setError('Erro ao criar categoria. Verifique os dados e tente novamente.');
      console.error('Failed to create category:', err);
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditCategory = async (name: string) => {
    if (!editingCategory) return;
    try {
      setFormLoading(true);
      setError(null);
      const updated = await categoryService.updateCategory(editingCategory.id, { name });
      setCategories(categories.map(c => c.id === updated.id ? updated : c));
      setEditingCategory(null);
    } catch (err) {
      setError('Erro ao atualizar categoria. Tente novamente.');
      console.error('Failed to update category:', err);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!deleteConfirm) return;
    try {
      setFormLoading(true);
      setError(null);
      await categoryService.deleteCategory(deleteConfirm.id);
      setCategories(categories.filter(c => c.id !== deleteConfirm.id));
      const newCounts = { ...eventCounts };
      delete newCounts[deleteConfirm.id];
      setEventCounts(newCounts);
      setDeleteConfirm(null);
    } catch (err: any) {
      const message = err?.message?.includes('eventos') 
        ? 'Não é possível excluir categoria com eventos associados.'
        : 'Erro ao excluir categoria. Tente novamente.';
      setError(message);
      console.error('Failed to delete category:', err);
    } finally {
      setFormLoading(false);
    }
  };

  // Event handlers
  const handleCreateEvent = async (data: CreateEventInput) => {
    try {
      setFormLoading(true);
      setError(null);
      const newEvent = await eventService.createEvent(data.categoryId, data.name, data.dates);
      setEvents([newEvent, ...events]);
      
      // Update event count for the category
      setEventCounts({
        ...eventCounts,
        [data.categoryId]: (eventCounts[data.categoryId] || 0) + 1,
      });
      
      setShowEventForm(false);
    } catch (err) {
      setError('Erro ao criar evento. Verifique os dados e tente novamente.');
      console.error('Failed to create event:', err);
    } finally {
      setFormLoading(false);
    }
  };

  const handleCloseEvent = async (event: Event) => {
    if (!window.confirm(`Tem certeza que deseja encerrar o evento "${event.name}"?`)) return;
    try {
      setError(null);
      const updated = await eventService.updateEventStatus(event.id, 'closed');
      setEvents(events.map(e => e.id === updated.id ? updated : e));
    } catch (err) {
      setError('Erro ao encerrar evento.');
      console.error('Failed to close event:', err);
    }
  };

  const handleBackToCategories = () => {
    setSelectedCategory(null);
    setViewMode('categories');
    setEvents([]);
    loadCategories();
  };

  const handleViewAllEvents = () => {
    setSelectedCategory(null);
    setViewMode('events');
    loadAllEvents();
  };

  const handleExportCategoryCSV = useCallback(async () => {
    if (!reportCategory) return;
    try {
      setExporting(true);
      const csvContent = await reportService.exportCategoryReportCSV(reportCategory.id);
      
      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `relatorio-categoria-${reportCategory.name}-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError('Erro ao exportar relatório');
      console.error('Failed to export CSV:', err);
    } finally {
      setExporting(false);
    }
  }, [reportCategory]);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: Colors.backgroundSecondary }}>
      {/* Error Banner */}
      {error && (
        <div
          style={{
            padding: Spacing.md,
            backgroundColor: Colors.danger,
            color: Colors.textLight,
            textAlign: 'center',
          }}
        >
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

      {/* Navigation Tabs */}
      <div style={{ 
        backgroundColor: Colors.background, 
        borderBottom: `1px solid ${Colors.border}`,
        padding: `${Spacing.sm}px ${Spacing.md}px`,
      }}>
        <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', gap: Spacing.md }}>
          <button
            onClick={handleBackToCategories}
            style={{
              padding: `${Spacing.sm}px ${Spacing.md}px`,
              backgroundColor: viewMode === 'categories' ? Colors.primary : 'transparent',
              color: viewMode === 'categories' ? Colors.textLight : Colors.text,
              border: 'none',
              borderRadius: BorderRadius.md,
              fontSize: FontSizes.md,
              fontWeight: viewMode === 'categories' ? 600 : 400,
              cursor: 'pointer',
            }}
          >
            Categorias
          </button>
          <button
            onClick={handleViewAllEvents}
            style={{
              padding: `${Spacing.sm}px ${Spacing.md}px`,
              backgroundColor: viewMode === 'events' ? Colors.primary : 'transparent',
              color: viewMode === 'events' ? Colors.textLight : Colors.text,
              border: 'none',
              borderRadius: BorderRadius.md,
              fontSize: FontSizes.md,
              fontWeight: viewMode === 'events' ? 600 : 400,
              cursor: 'pointer',
            }}
          >
            Todos os Eventos
          </button>
          {viewMode === 'category-events' && selectedCategory && (
            <span style={{
              padding: `${Spacing.sm}px ${Spacing.md}px`,
              backgroundColor: Colors.primary,
              color: Colors.textLight,
              borderRadius: BorderRadius.md,
              fontSize: FontSizes.md,
              fontWeight: 600,
            }}>
              {selectedCategory.name}
            </span>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: 800, margin: '0 auto', padding: Spacing.md }}>
        {viewMode === 'categories' && (
          <CategoryList
            categories={categories}
            eventCounts={eventCounts}
            loading={loading}
            onCategorySelect={handleCategorySelect}
            onCreateCategory={() => setShowCategoryForm(true)}
            onEditCategory={(cat) => setEditingCategory(cat)}
            onDeleteCategory={(cat) => setDeleteConfirm(cat)}
            onViewReport={(cat) => setReportCategory(cat)}
          />
        )}

        {(viewMode === 'events' || viewMode === 'category-events') && (
          <EventList
            events={events}
            categories={categories}
            groupByCategory={viewMode === 'events'}
            loading={loading}
            onEventSelect={onEventSelect}
            onCreateEvent={() => setShowEventForm(true)}
            onCloseEvent={handleCloseEvent}
          />
        )}
      </div>

      {/* Create Category Modal */}
      {showCategoryForm && (
        <div style={modalStyles.overlay} onClick={() => !formLoading && setShowCategoryForm(false)}>
          <div style={modalStyles.container} onClick={(e) => e.stopPropagation()}>
            <CategoryForm
              onSubmit={handleCreateCategory}
              onCancel={() => setShowCategoryForm(false)}
              loading={formLoading}
            />
          </div>
        </div>
      )}

      {/* Edit Category Modal */}
      {editingCategory && (
        <div style={modalStyles.overlay} onClick={() => !formLoading && setEditingCategory(null)}>
          <div style={modalStyles.container} onClick={(e) => e.stopPropagation()}>
            <CategoryForm
              category={editingCategory}
              onSubmit={handleEditCategory}
              onCancel={() => setEditingCategory(null)}
              loading={formLoading}
            />
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div style={modalStyles.overlay} onClick={() => !formLoading && setDeleteConfirm(null)}>
          <div style={modalStyles.container} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: Spacing.md }}>
              <h2 style={{ fontSize: FontSizes.xl, fontWeight: 600, color: Colors.text, marginBottom: Spacing.md }}>
                Confirmar Exclusão
              </h2>
              <p style={{ fontSize: FontSizes.md, color: Colors.textSecondary, marginBottom: Spacing.lg }}>
                Tem certeza que deseja excluir a categoria "{deleteConfirm.name}"?
              </p>
              <div style={{ display: 'flex', gap: Spacing.sm, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setDeleteConfirm(null)}
                  style={{
                    padding: `${Spacing.sm}px ${Spacing.lg}px`,
                    backgroundColor: Colors.backgroundSecondary,
                    color: Colors.text,
                    border: `1px solid ${Colors.border}`,
                    borderRadius: BorderRadius.md,
                    fontSize: FontSizes.md,
                    cursor: 'pointer',
                  }}
                  disabled={formLoading}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteCategory}
                  style={{
                    padding: `${Spacing.sm}px ${Spacing.lg}px`,
                    backgroundColor: Colors.danger,
                    color: Colors.textLight,
                    border: 'none',
                    borderRadius: BorderRadius.md,
                    fontSize: FontSizes.md,
                    fontWeight: 600,
                    cursor: formLoading ? 'not-allowed' : 'pointer',
                    opacity: formLoading ? 0.6 : 1,
                  }}
                  disabled={formLoading}
                >
                  {formLoading ? 'A excluir...' : 'Excluir'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Event Modal */}
      {showEventForm && (
        <div style={modalStyles.overlay} onClick={() => !formLoading && setShowEventForm(false)}>
          <div style={modalStyles.container} onClick={(e) => e.stopPropagation()}>
            <EventForm
              categories={categories}
              preSelectedCategoryId={selectedCategory?.id}
              onSubmit={handleCreateEvent}
              onCancel={() => setShowEventForm(false)}
              loading={formLoading}
            />
          </div>
        </div>
      )}

      {/* Category Report Modal */}
      {reportCategory && (
        <div style={modalStyles.overlay} onClick={() => !exporting && setReportCategory(null)}>
          <div 
            style={{ 
              ...modalStyles.container, 
              maxWidth: 800, 
              maxHeight: '90vh',
              overflow: 'auto',
            }} 
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              padding: Spacing.md,
              borderBottom: `1px solid ${Colors.border}`,
            }}>
              <h2 style={{ margin: 0, fontSize: FontSizes.lg, fontWeight: 600, color: Colors.text }}>
                Relatório: {reportCategory.name}
              </h2>
              <button
                onClick={() => setReportCategory(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: FontSizes.xl,
                  cursor: 'pointer',
                  color: Colors.textSecondary,
                }}
              >
                ×
              </button>
            </div>
            {exporting && (
              <div style={{
                padding: Spacing.sm,
                backgroundColor: Colors.primary,
                color: Colors.textLight,
                textAlign: 'center',
                fontSize: FontSizes.sm,
              }}>
                A exportar relatório...
              </div>
            )}
            <CategoryReportView
              apiClient={apiClient}
              category={reportCategory}
              onExportCSV={handleExportCategoryCSV}
            />
          </div>
        </div>
      )}
    </div>
  );
};
