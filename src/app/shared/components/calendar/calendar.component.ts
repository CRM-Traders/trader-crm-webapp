import { CommonModule } from '@angular/common';
import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  computed,
  signal,
} from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { ThemeService } from '../../../core/services/theme.service';
import { RouterModule } from '@angular/router';
import { CalendarService, CalendarEvent } from './services/calendar.service';

interface EventFormData {
  title: string;
  description: string;
  location: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  allDay: boolean;
  color: string;
}

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.scss'],
})
export class CalendarComponent implements OnInit, OnDestroy {
  private readonly themeService = inject(ThemeService);
  private readonly calendarService = inject(CalendarService);
  private readonly destroy$ = new Subject<void>();

  // Reactive state from services
  readonly isDarkMode = computed(() => this.themeService.isDarkMode$);
  readonly events = this.calendarService.events;
  readonly loading = this.calendarService.loading;
  readonly error = this.calendarService.error;

  // Component state signals
  private readonly _currentDate = signal(new Date());
  private readonly _displayDate = signal(new Date());
  private readonly _selectedDate = signal<Date | null>(null);
  private readonly _view = signal<'month' | 'week' | 'day' | 'list'>('month');

  readonly currentDate = this._currentDate.asReadonly();
  readonly displayDate = this._displayDate.asReadonly();
  readonly selectedDate = this._selectedDate.asReadonly();
  readonly view = this._view.asReadonly();

  // Modal and form state
  showEventModal = false;
  showEventDetails = false;
  showDeleteConfirm = false;
  editingEvent: CalendarEventDisplay | null = null;
  selectedEvent: CalendarEventDisplay | null = null;

  // Event form data
  eventFormData: EventFormData = {
    title: '',
    description: '',
    location: '',
    startDate: '',
    startTime: '09:00',
    endDate: '',
    endTime: '10:00',
    allDay: false,
    color: 'blue',
  };

  // Calendar display data
  weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  calendarDays: CalendarDay[] = [];
  weekHours: string[] = [];
  weekDates: Date[] = [];
  weekEvents: Record<string, CalendarEventDisplay[]> = {};

  // Available colors for events
  availableColors = [
    { value: 'blue', label: 'Blue', class: 'bg-blue-500' },
    { value: 'green', label: 'Green', class: 'bg-green-500' },
    { value: 'red', label: 'Red', class: 'bg-red-500' },
    { value: 'purple', label: 'Purple', class: 'bg-purple-500' },
    { value: 'orange', label: 'Orange', class: 'bg-orange-500' },
    { value: 'teal', label: 'Teal', class: 'bg-teal-500' },
    { value: 'gray', label: 'Gray', class: 'bg-gray-500' },
  ];

  // Computed properties for display
  readonly displayEvents = computed(() => {
    return this.events().map((event) => this.convertToDisplayEvent(event));
  });

  readonly filteredEvents = computed(() => {
    const view = this._view();
    const displayDate = this._displayDate();
    const events = this.displayEvents();

    switch (view) {
      case 'month':
        return this.getEventsForMonth(events, displayDate);
      case 'week':
        return this.getEventsForWeek(events, displayDate);
      case 'list':
        return this.getUpcomingEvents(events);
      default:
        return events;
    }
  });

  ngOnInit(): void {
    this.initializeComponent();
    this.subscribeToThemeChanges();
    this.loadInitialData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeComponent(): void {
    this.generateCalendarDays();
    this.generateWeekDays();
    this.generateHours();
  }

  private subscribeToThemeChanges(): void {
    this.themeService.isDarkMode$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        // Theme changes are handled reactively through computed signals
      });
  }

  private loadInitialData(): void {
    this.loadEventsForCurrentView();
  }

  private loadEventsForCurrentView(): void {
    const view = this._view();
    const displayDate = this._displayDate();
    let startDate: Date;
    let endDate: Date;

    switch (view) {
      case 'month':
        startDate = new Date(
          displayDate.getFullYear(),
          displayDate.getMonth(),
          1
        );
        endDate = new Date(
          displayDate.getFullYear(),
          displayDate.getMonth() + 1,
          0
        );
        break;
      case 'week':
        startDate = this.getWeekStart(displayDate);
        endDate = this.getWeekEnd(displayDate);
        break;
      default:
        startDate = new Date(
          displayDate.getFullYear(),
          displayDate.getMonth(),
          1
        );
        endDate = new Date(
          displayDate.getFullYear(),
          displayDate.getMonth() + 1,
          0
        );
    }

    this.calendarService
      .getEvents(startDate, endDate)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.updateEventsDisplay();
        },
        error: (error) => {
          console.error('Failed to load calendar events:', error);
        },
      });
  }

  private convertToDisplayEvent(event: CalendarEvent): CalendarEventDisplay {
    return {
      id: event.id,
      title: event.title,
      description: event.description || undefined,
      location: event.location || undefined,
      start: new Date(event.start),
      end: new Date(event.end),
      allDay: event.allDay,
      color: event.color,
    };
  }

  private getEventsForMonth(
    events: CalendarEventDisplay[],
    displayDate: Date
  ): CalendarEventDisplay[] {
    const startOfMonth = new Date(
      displayDate.getFullYear(),
      displayDate.getMonth(),
      1
    );
    const endOfMonth = new Date(
      displayDate.getFullYear(),
      displayDate.getMonth() + 1,
      0
    );

    return events.filter((event) => {
      const eventDate = event.start;
      return eventDate >= startOfMonth && eventDate <= endOfMonth;
    });
  }

  private getEventsForWeek(
    events: CalendarEventDisplay[],
    displayDate: Date
  ): CalendarEventDisplay[] {
    const weekStart = this.getWeekStart(displayDate);
    const weekEnd = this.getWeekEnd(displayDate);

    return events.filter((event) => {
      const eventDate = event.start;
      return eventDate >= weekStart && eventDate <= weekEnd;
    });
  }

  private getUpcomingEvents(
    events: CalendarEventDisplay[]
  ): CalendarEventDisplay[] {
    const now = new Date();
    return events
      .filter((event) => event.start >= now)
      .sort((a, b) => a.start.getTime() - b.start.getTime());
  }

  private getWeekStart(date: Date): Date {
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    weekStart.setHours(0, 0, 0, 0);
    return weekStart;
  }

  private getWeekEnd(date: Date): Date {
    const weekEnd = new Date(date);
    weekEnd.setDate(date.getDate() - date.getDay() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    return weekEnd;
  }

  // Event Management Methods
  openCreateEventModal(selectedDate?: Date): void {
    this.editingEvent = null;
    this.resetEventForm();

    if (selectedDate) {
      const dateString = this.formatDateForInput(selectedDate);
      this.eventFormData.startDate = dateString;
      this.eventFormData.endDate = dateString;
    } else {
      const today = new Date();
      const todayString = this.formatDateForInput(today);
      this.eventFormData.startDate = todayString;
      this.eventFormData.endDate = todayString;
    }

    this.showEventModal = true;
  }

  openEditEventModal(event: CalendarEventDisplay): void {
    this.editingEvent = event;
    this.populateEventForm(event);
    this.showEventModal = true;
    this.showEventDetails = false;
  }

  openEventDetails(event: CalendarEventDisplay): void {
    this.selectedEvent = event;
    this.showEventDetails = true;
  }

  closeEventModal(): void {
    this.showEventModal = false;
    this.editingEvent = null;
    this.resetEventForm();
  }

  closeEventDetails(): void {
    this.showEventDetails = false;
    this.selectedEvent = null;
  }

  private resetEventForm(): void {
    this.eventFormData = {
      title: '',
      description: '',
      location: '',
      startDate: '',
      startTime: '09:00',
      endDate: '',
      endTime: '10:00',
      allDay: false,
      color: 'blue',
    };
  }

  private populateEventForm(event: CalendarEventDisplay): void {
    this.eventFormData = {
      title: event.title,
      description: event.description || '',
      location: event.location || '',
      startDate: this.formatDateForInput(event.start),
      startTime: this.formatTimeForInput(event.start),
      endDate: this.formatDateForInput(event.end),
      endTime: this.formatTimeForInput(event.end),
      allDay: event.allDay,
      color: event.color,
    };
  }

  onAllDayChange(): void {
    if (this.eventFormData.allDay) {
      this.eventFormData.startTime = '00:00';
      this.eventFormData.endTime = '23:59';
    } else {
      this.eventFormData.startTime = '09:00';
      this.eventFormData.endTime = '10:00';
    }
  }

  saveEvent(form: NgForm): void {
    if (!form.valid) {
      return;
    }

    const startDateTime = this.createDateTimeFromForm(
      this.eventFormData.startDate,
      this.eventFormData.allDay ? '00:00' : this.eventFormData.startTime
    );

    const endDateTime = this.createDateTimeFromForm(
      this.eventFormData.endDate,
      this.eventFormData.allDay ? '23:59' : this.eventFormData.endTime
    );

    const eventData = {
      title: this.eventFormData.title.trim(),
      description: this.eventFormData.description.trim() || undefined,
      location: this.eventFormData.location.trim() || undefined,
      start: startDateTime,
      end: endDateTime,
      allDay: this.eventFormData.allDay,
      color: this.eventFormData.color,
    };

    if (this.editingEvent) {
      this.updateEvent(this.editingEvent.id, eventData);
    } else {
      this.createEvent(eventData);
    }
  }

  createEvent(eventData: {
    title: string;
    description?: string;
    location?: string;
    start: Date;
    end: Date;
    allDay: boolean;
    color: string;
  }): void {
    const createData = {
      title: eventData.title,
      description: eventData.description || null,
      location: eventData.location || null,
      startTime: this.calendarService.createISOString(eventData.start),
      endTime: this.calendarService.createISOString(eventData.end),
      allDay: eventData.allDay,
      color: eventData.color,
    };

    this.calendarService
      .createEvent(createData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.closeEventModal();
          this.updateEventsDisplay();
        },
        error: (error) => {
          console.error('Failed to create event:', error);
        },
      });
  }

  updateEvent(
    eventId: string,
    eventData: {
      title: string;
      description?: string;
      location?: string;
      start: Date;
      end: Date;
      allDay: boolean;
      color: string;
    }
  ): void {
    const updateData = {
      title: eventData.title,
      description: eventData.description || null,
      location: eventData.location || null,
      startTime: this.calendarService.createISOString(eventData.start),
      endTime: this.calendarService.createISOString(eventData.end),
      allDay: eventData.allDay,
      color: eventData.color,
    };

    this.calendarService
      .updateEvent(eventId, updateData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.closeEventModal();
          this.closeEventDetails();
          this.updateEventsDisplay();
        },
        error: (error) => {
          console.error('Failed to update event:', error);
        },
      });
  }

  confirmDeleteEvent(): void {
    this.showDeleteConfirm = true;
  }

  executeDeleteEvent(): void {
    const eventToDelete = this.editingEvent || this.selectedEvent;
    if (!eventToDelete) {
      return;
    }

    this.calendarService
      .deleteEvent(eventToDelete.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.showDeleteConfirm = false;
          this.closeEventModal();
          this.closeEventDetails();
          this.updateEventsDisplay();
        },
        error: (error) => {
          console.error('Failed to delete event:', error);
          this.showDeleteConfirm = false;
        },
      });
  }

  clearError(): void {
    // This would be implemented in the calendar service
    // For now, we'll just trigger a refresh
    this.refreshEvents();
  }

  showMoreEvents(day: CalendarDay): void {
    // Implementation for showing more events in a day
    // Could open a modal or expand the day view
    this.selectDate(day);
  }

  // Helper Methods
  private formatDateForInput(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private formatTimeForInput(date: Date): string {
    return date.toTimeString().slice(0, 5);
  }

  private createDateTimeFromForm(dateString: string, timeString: string): Date {
    return new Date(`${dateString}T${timeString}:00`);
  }

  private createDateTimeFromFormISO(
    dateString: string,
    timeString: string
  ): string {
    return new Date(`${dateString}T${timeString}:00`).toISOString();
  }

  // Calendar Navigation and Display Methods
  getDateFromString(dateString: string): Date {
    return new Date(dateString);
  }

  generateCalendarDays(): void {
    this.calendarDays = [];
    const displayDate = this._displayDate();

    const firstDayOfMonth = new Date(
      displayDate.getFullYear(),
      displayDate.getMonth(),
      1
    );
    const lastDayOfMonth = new Date(
      displayDate.getFullYear(),
      displayDate.getMonth() + 1,
      0
    );
    const firstDayOfWeek = firstDayOfMonth.getDay();
    const prevMonthLastDay = new Date(
      displayDate.getFullYear(),
      displayDate.getMonth(),
      0
    ).getDate();

    // Previous month days
    for (let i = 0; i < firstDayOfWeek; i++) {
      const day = prevMonthLastDay - firstDayOfWeek + i + 1;
      const date = new Date(
        displayDate.getFullYear(),
        displayDate.getMonth() - 1,
        day
      );
      this.calendarDays.push({
        date,
        day,
        isCurrentMonth: false,
        isToday: this.isToday(date),
        hasEvents: false,
        events: [],
      });
    }

    // Current month days
    for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
      const date = new Date(
        displayDate.getFullYear(),
        displayDate.getMonth(),
        i
      );
      this.calendarDays.push({
        date,
        day: i,
        isCurrentMonth: true,
        isToday: this.isToday(date),
        hasEvents: false,
        events: [],
      });
    }

    // Next month days
    const remainingDays = 42 - this.calendarDays.length;
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(
        displayDate.getFullYear(),
        displayDate.getMonth() + 1,
        i
      );
      this.calendarDays.push({
        date,
        day: i,
        isCurrentMonth: false,
        isToday: this.isToday(date),
        hasEvents: false,
        events: [],
      });
    }
  }

  generateWeekDays(): void {
    this.weekDates = [];
    const displayDate = this._displayDate();
    const startDate = this.getWeekStart(displayDate);

    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      this.weekDates.push(date);
    }
  }

  generateHours(): void {
    this.weekHours = [];
    for (let i = 0; i < 24; i++) {
      const hour = i % 12 === 0 ? 12 : i % 12;
      const ampm = i < 12 ? 'AM' : 'PM';
      this.weekHours.push(`${hour}:00 ${ampm}`);
    }
  }

  updateEventsDisplay(): void {
    const events = this.displayEvents();

    // Update calendar days with events
    this.calendarDays.forEach((day) => {
      day.events = events
        .filter((event) => this.isSameDay(event.start, day.date))
        .slice(0, 3);
      day.hasEvents = day.events.length > 0;
    });

    // Update week events
    this.weekEvents = {};
    this.weekDates.forEach((date, dayIndex) => {
      const dayKey = `day_${dayIndex}`;
      this.weekEvents[dayKey] = events.filter((event) =>
        this.isSameDay(event.start, date)
      );
    });
  }

  isSameDay(date1: Date, date2: Date): boolean {
    return (
      date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear()
    );
  }

  isToday(date: Date): boolean {
    const today = new Date();
    return this.isSameDay(date, today);
  }

  // Navigation methods
  goToPreviousMonth(): void {
    const newDate = new Date(this._displayDate());
    newDate.setMonth(newDate.getMonth() - 1);
    this._displayDate.set(newDate);
    this.generateCalendarDays();
    this.loadEventsForCurrentView();
  }

  goToNextMonth(): void {
    const newDate = new Date(this._displayDate());
    newDate.setMonth(newDate.getMonth() + 1);
    this._displayDate.set(newDate);
    this.generateCalendarDays();
    this.loadEventsForCurrentView();
  }

  goToPreviousWeek(): void {
    const newDate = new Date(this._displayDate());
    newDate.setDate(newDate.getDate() - 7);
    this._displayDate.set(newDate);
    this.generateWeekDays();
    this.loadEventsForCurrentView();
  }

  goToNextWeek(): void {
    const newDate = new Date(this._displayDate());
    newDate.setDate(newDate.getDate() + 7);
    this._displayDate.set(newDate);
    this.generateWeekDays();
    this.loadEventsForCurrentView();
  }

  goToToday(): void {
    const today = new Date();
    this._displayDate.set(today);
    this._currentDate.set(today);
    this.generateCalendarDays();
    this.generateWeekDays();
    this.loadEventsForCurrentView();
  }

  selectDate(day: CalendarDay): void {
    this._selectedDate.set(day.date);
  }

  changeView(view: 'month' | 'week' | 'day' | 'list'): void {
    this._view.set(view);

    if (view === 'week') {
      this.generateWeekDays();
    }

    this.loadEventsForCurrentView();
  }

  refreshEvents(): void {
    this.loadEventsForCurrentView();
  }

  // Formatting methods
  formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
  }

  formatWeekRange(): string {
    if (this.weekDates.length < 7) return '';

    const firstDay = this.weekDates[0];
    const lastDay = this.weekDates[6];

    if (firstDay.getMonth() === lastDay.getMonth()) {
      return `${firstDay.toLocaleDateString('en-US', {
        month: 'long',
      })} ${firstDay.getDate()} - ${lastDay.getDate()}, ${firstDay.getFullYear()}`;
    } else {
      return `${firstDay.toLocaleDateString('en-US', {
        month: 'short',
      })} ${firstDay.getDate()} - ${lastDay.toLocaleDateString('en-US', {
        month: 'short',
      })} ${lastDay.getDate()}, ${firstDay.getFullYear()}`;
    }
  }

  formatEventTime(event: CalendarEventDisplay): string {
    if (event.allDay) {
      return 'All Day';
    } else {
      return `${this.formatTimeString(event.start)} - ${this.formatTimeString(
        event.end
      )}`;
    }
  }

  formatTimeString(date: Date): string {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }

  calculateEventPosition(
    event: CalendarEventDisplay,
    dayIndex: number
  ): { top: string; height: string } {
    const startHour = event.start.getHours();
    const startMinutes = event.start.getMinutes();
    const endHour = event.end.getHours();
    const endMinutes = event.end.getMinutes();

    const hourHeight = 60;
    const top = startHour * hourHeight + (startMinutes / 60) * hourHeight;
    const duration = endHour - startHour + (endMinutes - startMinutes) / 60;
    const height = Math.max(30, duration * hourHeight);

    return { top: `${top}px`, height: `${height}px` };
  }

  getEventStyles(color: string): string {
    const bgColors: Record<string, string> = {
      blue: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-700',
      green:
        'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border-green-300 dark:border-green-700',
      red: 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 border-red-300 dark:border-red-700',
      purple:
        'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 border-purple-300 dark:border-purple-700',
      orange:
        'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 border-orange-300 dark:border-orange-700',
      teal: 'bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200 border-teal-300 dark:border-teal-700',
      gray: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-600',
    };

    return bgColors[color] || bgColors['blue'];
  }

  getDotColor(color: string): string {
    const dotColors: Record<string, string> = {
      blue: 'bg-blue-500',
      green: 'bg-green-500',
      red: 'bg-red-500',
      purple: 'bg-purple-500',
      orange: 'bg-orange-500',
      teal: 'bg-teal-500',
      gray: 'bg-gray-500',
    };

    return dotColors[color] || dotColors['blue'];
  }

  formatListEventDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  }

  groupEventsByDay(
    events: CalendarEventDisplay[]
  ): { date: string; events: CalendarEventDisplay[] }[] {
    const groupedEvents: { [key: string]: CalendarEventDisplay[] } = {};

    events.forEach((event) => {
      const dateKey = event.start.toDateString();
      if (!groupedEvents[dateKey]) {
        groupedEvents[dateKey] = [];
      }
      groupedEvents[dateKey].push(event);
    });

    return Object.keys(groupedEvents).map((dateKey) => ({
      date: dateKey,
      events: groupedEvents[dateKey],
    }));
  }

  // Getter for template access to filtered events
  get allEvents(): CalendarEventDisplay[] {
    return this.filteredEvents();
  }
}

interface CalendarDay {
  date: Date;
  day: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  hasEvents: boolean;
  events: CalendarEventDisplay[];
}

interface CalendarEventDisplay {
  id: string;
  title: string;
  description?: string;
  location?: string;
  start: Date;
  end: Date;
  allDay: boolean;
  color: string;
}
