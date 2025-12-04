import React, { useState, useEffect } from 'react';
import { Event, CreateEventInput } from '@cantina-pos/shared';
import { EventApiService, ApiClient } from '@cantina-pos/shared';
import { Colors, Spacing, getModalStyles } from '@cantina-pos/shared';
import { EventList, EventForm } from '../components/events';

interface EventsPageProps {
  apiClient: ApiClient;
  onEventSelect: (event: Event) => void;
}

export const EventsPage: React.FC<EventsPageProps> = ({
  apiClient,
  onEventSelect,
}) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const eventService = new EventApiService(apiClient);
  const modalStyles = getModalStyles();

  const loadEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await eventService.getEvents();
      // Sort by createdAt descending (most recent first)
      setEvents(data.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ));
    } catch (err) {
      setError('Erro ao carregar eventos. Tente novamente.');
      console.error('Failed to load events:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const handleCreateEvent = async (data: CreateEventInput) => {
    try {
      setFormLoading(true);
      setError(null);
      const newEvent = await eventService.createEvent(data.name, data.dates, data.categories);
      setEvents([newEvent, ...events]);
      setShowForm(false);
    } catch (err) {
      setError('Erro ao criar evento. Verifique os dados e tente novamente.');
      console.error('Failed to create event:', err);
    } finally {
      setFormLoading(false);
    }
  };

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

      {/* Main Content */}
      <div style={{ maxWidth: 800, margin: '0 auto', padding: Spacing.md }}>
        <EventList
          events={events}
          loading={loading}
          onEventSelect={onEventSelect}
          onCreateEvent={() => setShowForm(true)}
        />
      </div>

      {/* Create Event Modal */}
      {showForm && (
        <div style={modalStyles.overlay} onClick={() => !formLoading && setShowForm(false)}>
          <div
            style={modalStyles.container}
            onClick={(e) => e.stopPropagation()}
          >
            <EventForm
              onSubmit={handleCreateEvent}
              onCancel={() => setShowForm(false)}
              loading={formLoading}
            />
          </div>
        </div>
      )}
    </div>
  );
};
