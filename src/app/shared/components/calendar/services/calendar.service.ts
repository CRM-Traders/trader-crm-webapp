import { Injectable, inject, signal } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import {
  Observable,
  BehaviorSubject,
  throwError,
  catchError,
  tap,
  map,
} from 'rxjs';
import { AlertService } from '../../../../core/services/alert.service';
import { HttpService } from '../../../../core/services/http.service';

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string | null;
  location?: string | null;
  start: string; // ISO date string
  end: string; // ISO date string
  allDay: boolean;
  color: string;
}

export interface CalendarEventCreate {
  title: string;
  description?: string | null;
  location?: string | null;
  startTime: string; // ISO date string
  endTime: string; // ISO date string
  allDay: boolean;
  color: string;
}

export interface CalendarEventUpdate extends CalendarEventCreate {
  id: string;
}

export interface CalendarEventsResponse {
  events: CalendarEvent[];
}

export interface CalendarEventDeleteResponse {
  success: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class CalendarService {
  private readonly http = inject(HttpService);
  private readonly alertService = inject(AlertService);
  private readonly baseEndpoint = 'identity/api/calendar/events';

  // Reactive state management
  private readonly _events = signal<CalendarEvent[]>([]);
  private readonly _loading = signal<boolean>(false);
  private readonly _error = signal<string | null>(null);

  // Public readonly signals
  readonly events = this._events.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  // Event cache for performance optimization
  private eventsCache = new BehaviorSubject<CalendarEvent[]>([]);
  private lastFetchParams: string | null = null;

  constructor() {
    // Initialize with empty events
    this.loadEvents();
  }

  /**
   * Get all events with optional date range filtering
   */
  getEvents(startDate?: Date, endDate?: Date): Observable<CalendarEvent[]> {
    this._loading.set(true);
    this._error.set(null);

    let params = new HttpParams();

    if (startDate) {
      params = params.set('startDate', startDate.toISOString());
    }

    if (endDate) {
      params = params.set('endDate', endDate.toISOString());
    }

    // Create cache key for parameters
    const cacheKey = params.toString();

    // Return cached data if parameters haven't changed
    if (this.lastFetchParams === cacheKey && this._events().length > 0) {
      this._loading.set(false);
      return this.eventsCache.asObservable();
    }

    return this.http
      .get<CalendarEventsResponse>(this.baseEndpoint, params)
      .pipe(
        map((response) => response.events || []),
        tap((events) => {
          this._events.set(events);
          this.eventsCache.next(events);
          this.lastFetchParams = cacheKey;
          this._loading.set(false);
        }),
        catchError((error) => {
          this._loading.set(false);
          this._error.set(this.getErrorMessage(error));
          this.alertService.error('Failed to load calendar events');
          return throwError(() => error);
        })
      );
  }

  /**
   * Get a specific event by ID
   */
  getEvent(eventId: string): Observable<CalendarEvent> {
    this._loading.set(true);
    this._error.set(null);

    // Check cache first
    const cachedEvent = this._events().find((event) => event.id === eventId);
    if (cachedEvent) {
      this._loading.set(false);
      return new Observable((observer) => {
        observer.next(cachedEvent);
        observer.complete();
      });
    }

    return this.http
      .get<{ event: CalendarEvent }>(`${this.baseEndpoint}/${eventId}`)
      .pipe(
        map((response) => response.event),
        tap(() => this._loading.set(false)),
        catchError((error) => {
          this._loading.set(false);
          this._error.set(this.getErrorMessage(error));
          this.alertService.error('Failed to load event details');
          return throwError(() => error);
        })
      );
  }

  /**
   * Create a new calendar event
   */
  createEvent(event: CalendarEventCreate): Observable<CalendarEvent> {
    this._loading.set(true);
    this._error.set(null);

    // Validate event data
    const validationError = this.validateEvent(event);
    if (validationError) {
      this._loading.set(false);
      this.alertService.error(validationError);
      return throwError(() => new Error(validationError));
    }

    return this.http
      .post<{ event: CalendarEvent }>(this.baseEndpoint, event)
      .pipe(
        map((response) => response.event),
        tap((newEvent) => {
          // Update local cache
          const currentEvents = this._events();
          this._events.set([...currentEvents, newEvent]);
          this.eventsCache.next(this._events());

          this._loading.set(false);
          this.alertService.success('Event created successfully');
        }),
        catchError((error) => {
          this._loading.set(false);
          this._error.set(this.getErrorMessage(error));
          this.alertService.error('Failed to create event');
          return throwError(() => error);
        })
      );
  }

  /**
   * Update an existing calendar event
   */
  updateEvent(
    eventId: string,
    event: CalendarEventCreate
  ): Observable<CalendarEvent> {
    this._loading.set(true);
    this._error.set(null);

    // Validate event data
    const validationError = this.validateEvent(event);
    if (validationError) {
      this._loading.set(false);
      this.alertService.error(validationError);
      return throwError(() => new Error(validationError));
    }

    const updateData: CalendarEventUpdate = { ...event, id: eventId };

    return this.http
      .put<{ event: CalendarEvent }>(
        `${this.baseEndpoint}/${eventId}`,
        updateData
      )
      .pipe(
        map((response) => response.event),
        tap((updatedEvent) => {
          // Update local cache
          const currentEvents = this._events();
          const eventIndex = currentEvents.findIndex((e) => e.id === eventId);

          if (eventIndex !== -1) {
            const newEvents = [...currentEvents];
            newEvents[eventIndex] = updatedEvent;
            this._events.set(newEvents);
            this.eventsCache.next(newEvents);
          }

          this._loading.set(false);
          this.alertService.success('Event updated successfully');
        }),
        catchError((error) => {
          this._loading.set(false);
          this._error.set(this.getErrorMessage(error));
          this.alertService.error('Failed to update event');
          return throwError(() => error);
        })
      );
  }

  /**
   * Delete a calendar event
   */
  deleteEvent(eventId: string): Observable<boolean> {
    this._loading.set(true);
    this._error.set(null);

    return this.http
      .delete<CalendarEventDeleteResponse>(`${this.baseEndpoint}/${eventId}`)
      .pipe(
        map((response) => response.success),
        tap((success) => {
          if (success) {
            // Update local cache
            const currentEvents = this._events();
            const filteredEvents = currentEvents.filter(
              (event) => event.id !== eventId
            );
            this._events.set(filteredEvents);
            this.eventsCache.next(filteredEvents);

            this.alertService.success('Event deleted successfully');
          }
          this._loading.set(false);
        }),
        catchError((error) => {
          this._loading.set(false);
          this._error.set(this.getErrorMessage(error));
          this.alertService.error('Failed to delete event');
          return throwError(() => error);
        })
      );
  }

  /**
   * Get events for a specific date
   */
  getEventsForDate(date: Date): CalendarEvent[] {
    const targetDate = this.formatDateToString(date);
    return this._events().filter((event) => {
      const eventStartDate = this.formatDateToString(new Date(event.end));
      return eventStartDate === targetDate;
    });
  }

  /**
   * Get events for a date range
   */
  getEventsForDateRange(startDate: Date, endDate: Date): CalendarEvent[] {
    const start = startDate.getTime();
    const end = endDate.getTime();

    return this._events().filter((event) => {
      const eventStart = new Date(event.start).getTime();
      return eventStart >= start && eventStart <= end;
    });
  }

  /**
   * Refresh events from server
   */
  refreshEvents(startDate?: Date, endDate?: Date): Observable<CalendarEvent[]> {
    this.clearCache();
    return this.getEvents(startDate, endDate);
  }

  /**
   * Clear the local cache
   */
  clearCache(): void {
    this._events.set([]);
    this.eventsCache.next([]);
    this.lastFetchParams = null;
    this._error.set(null);
  }

  /**
   * Load initial events
   */
  private loadEvents(): void {
    // Load events for current month by default
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    this.getEvents(startOfMonth, endOfMonth).subscribe({
      error: () => {},
    });
  }

  /**
   * Validate event data before sending to server
   */
  private validateEvent(event: CalendarEventCreate): string | null {
    if (!event.title || event.title.trim().length === 0) {
      return 'Event title is required';
    }

    if (event.title.length > 255) {
      return 'Event title cannot exceed 255 characters';
    }

    if (!event.startTime) {
      return 'Event start date is required';
    }

    if (!event.endTime) {
      return 'Event end date is required';
    }

    const startDate = new Date(event.startTime);
    const endDate = new Date(event.endTime);

    if (isNaN(startDate.getTime())) {
      return 'Invalid start date format';
    }

    if (isNaN(endDate.getTime())) {
      return 'Invalid end date format';
    }

    if (!event.allDay && endDate <= startDate) {
      return 'Event end date must be after start date';
    }

    if (event.description && event.description.length > 1000) {
      return 'Event description cannot exceed 1000 characters';
    }

    if (event.location && event.location.length > 255) {
      return 'Event location cannot exceed 255 characters';
    }

    const validColors = [
      'blue',
      'green',
      'red',
      'purple',
      'orange',
      'teal',
      'gray',
    ];
    if (!validColors.includes(event.color)) {
      return 'Invalid event color';
    }

    return null;
  }

  /**
   * Extract error message from HTTP error response
   */
  private getErrorMessage(error: any): string {
    if (error?.error?.message) {
      return error.error.message;
    }

    if (error?.message) {
      return error.message;
    }

    if (error?.status) {
      switch (error.status) {
        case 400:
          return 'Bad request. Please check your input data.';
        case 401:
          return 'Unauthorized. Please log in again.';
        case 403:
          return 'Forbidden. You do not have permission to perform this action.';
        case 404:
          return 'Event not found.';
        case 409:
          return 'Conflict. This event may have been modified by another user.';
        case 500:
          return 'Server error. Please try again later.';
        default:
          return `HTTP Error: ${error.status}`;
      }
    }

    return 'An unexpected error occurred. Please try again.';
  }

  /**
   * Helper method to format date to YYYY-MM-DD string
   */
  private formatDateToString(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Helper method to create ISO date string from Date object
   */
  createISOString(date: Date): string {
    return date.toISOString();
  }

  /**
   * Helper method to create Date object from ISO string
   */
  parseISOString(isoString: string): Date {
    return new Date(isoString);
  }

  /**
   * Get available event colors
   */
  getAvailableColors(): Array<{ value: string; label: string; class: string }> {
    return [
      { value: 'blue', label: 'Blue', class: 'bg-blue-500' },
      { value: 'green', label: 'Green', class: 'bg-green-500' },
      { value: 'red', label: 'Red', class: 'bg-red-500' },
      { value: 'purple', label: 'Purple', class: 'bg-purple-500' },
      { value: 'orange', label: 'Orange', class: 'bg-orange-500' },
      { value: 'teal', label: 'Teal', class: 'bg-teal-500' },
      { value: 'gray', label: 'Gray', class: 'bg-gray-500' },
    ];
  }
}
