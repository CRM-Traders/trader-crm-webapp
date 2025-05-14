import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ThemeService } from '../../../core/services/theme.service';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.scss'],
})
export class CalendarComponent implements OnInit {
  private themeService = inject(ThemeService);

  isDarkMode = false;
  currentDate = new Date();
  displayDate = new Date();
  selectedDate: Date | null = null;
  weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  calendarDays: CalendarDay[] = [];
  weekHours: string[] = [];
  weekDates: Date[] = [];
  allEvents: CalendarEvent[] = [];
  weekEvents: Record<string, CalendarEvent[]> = {};
  monthEvents: CalendarEvent[] = [];

  view: 'month' | 'week' | 'day' | 'list' = 'month';

  ngOnInit(): void {
    this.themeService.isDarkMode$.subscribe((isDark) => {
      this.isDarkMode = isDark;
    });

    this.generateCalendarDays();
    this.generateWeekDays();
    this.generateHours();
    this.generateSampleEvents();
    this.updateEventsDisplay();
  }

  getDateFromString(dateString: string): Date {
    return new Date(dateString);
  }

  generateCalendarDays(): void {
    this.calendarDays = [];

    const firstDayOfMonth = new Date(
      this.displayDate.getFullYear(),
      this.displayDate.getMonth(),
      1
    );

    const lastDayOfMonth = new Date(
      this.displayDate.getFullYear(),
      this.displayDate.getMonth() + 1,
      0
    );

    const firstDayOfWeek = firstDayOfMonth.getDay();

    const prevMonthLastDay = new Date(
      this.displayDate.getFullYear(),
      this.displayDate.getMonth(),
      0
    ).getDate();

    for (let i = 0; i < firstDayOfWeek; i++) {
      const day = prevMonthLastDay - firstDayOfWeek + i + 1;
      const date = new Date(
        this.displayDate.getFullYear(),
        this.displayDate.getMonth() - 1,
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

    for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
      const date = new Date(
        this.displayDate.getFullYear(),
        this.displayDate.getMonth(),
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

    const remainingDays = 42 - this.calendarDays.length;
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(
        this.displayDate.getFullYear(),
        this.displayDate.getMonth() + 1,
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

    const startDate = new Date(this.displayDate);
    startDate.setDate(startDate.getDate() - startDate.getDay());

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

  generateSampleEvents(): void {
    this.allEvents = [];

    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    const date = this.currentDate.getDate();

    this.allEvents = [
      {
        id: '1',
        title: 'Team Meeting',
        description: 'Weekly team sync with project updates',
        location: 'Conference Room A',
        start: new Date(year, month, date, 10, 0),
        end: new Date(year, month, date, 11, 30),
        allDay: false,
        color: 'blue',
      },
      {
        id: '2',
        title: 'Client Presentation',
        description: 'Presenting new trading platform features',
        location: 'Main Boardroom',
        start: new Date(year, month, date + 1, 14, 0),
        end: new Date(year, month, date + 1, 15, 30),
        allDay: false,
        color: 'green',
      },
      {
        id: '3',
        title: 'Quarterly Review',
        description: 'Review of Q2 performance metrics',
        location: 'Virtual Meeting',
        start: new Date(year, month, date + 2, 9, 0),
        end: new Date(year, month, date + 2, 12, 0),
        allDay: false,
        color: 'purple',
      },
      {
        id: '4',
        title: 'System Maintenance',
        description: 'Scheduled downtime for server updates',
        location: 'N/A',
        start: new Date(year, month, date + 3),
        end: new Date(year, month, date + 3),
        allDay: true,
        color: 'red',
      },
      {
        id: '5',
        title: 'Training Workshop',
        description: 'New compliance procedures training',
        location: 'Training Room 2',
        start: new Date(year, month, date - 1, 13, 0),
        end: new Date(year, month, date - 1, 16, 0),
        allDay: false,
        color: 'orange',
      },
      {
        id: '6',
        title: 'Market Analysis',
        description: 'Weekly market trend review',
        location: 'Trading Floor',
        start: new Date(year, month, date - 2, 8, 30),
        end: new Date(year, month, date - 2, 9, 30),
        allDay: false,
        color: 'teal',
      },
      {
        id: '7',
        title: 'Holiday - Memorial Day',
        description: 'Office Closed',
        location: 'N/A',
        start: new Date(year, month, date + 5),
        end: new Date(year, month, date + 5),
        allDay: true,
        color: 'gray',
      },
    ];
  }

  updateEventsDisplay(): void {
    this.calendarDays.forEach((day) => {
      day.events = this.allEvents
        .filter((event) => this.isSameDay(event.start, day.date))
        .slice(0, 3);

      day.hasEvents = day.events.length > 0;
    });

    this.weekEvents = {};
    this.weekDates.forEach((date, dayIndex) => {
      const dayKey = `day_${dayIndex}`;
      this.weekEvents[dayKey] = this.allEvents.filter((event) =>
        this.isSameDay(event.start, date)
      );
    });

    this.allEvents.sort((a, b) => a.start.getTime() - b.start.getTime());
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
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  }

  goToPreviousMonth(): void {
    this.displayDate = new Date(
      this.displayDate.getFullYear(),
      this.displayDate.getMonth() - 1,
      1
    );
    this.generateCalendarDays();
    this.updateEventsDisplay();
  }

  goToNextMonth(): void {
    this.displayDate = new Date(
      this.displayDate.getFullYear(),
      this.displayDate.getMonth() + 1,
      1
    );
    this.generateCalendarDays();
    this.updateEventsDisplay();
  }

  goToPreviousWeek(): void {
    const newDate = new Date(this.displayDate);
    newDate.setDate(newDate.getDate() - 7);
    this.displayDate = newDate;
    this.generateWeekDays();
    this.updateEventsDisplay();
  }

  goToNextWeek(): void {
    const newDate = new Date(this.displayDate);
    newDate.setDate(newDate.getDate() + 7);
    this.displayDate = newDate;
    this.generateWeekDays();
    this.updateEventsDisplay();
  }

  goToToday(): void {
    this.displayDate = new Date();
    this.generateCalendarDays();
    this.generateWeekDays();
    this.updateEventsDisplay();
  }

  selectDate(day: CalendarDay): void {
    this.selectedDate = day.date;
  }

  changeView(view: 'month' | 'week' | 'day' | 'list'): void {
    this.view = view;

    if (view === 'week') {
      this.generateWeekDays();
    }

    this.updateEventsDisplay();
  }

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

  formatEventTime(event: CalendarEvent): string {
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
    event: CalendarEvent,
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

  getEventStyles(color: string): any {
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
    events: CalendarEvent[]
  ): { date: string; events: CalendarEvent[] }[] {
    const groupedEvents: { [key: string]: CalendarEvent[] } = {};

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
}

interface CalendarDay {
  date: Date;
  day: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  hasEvents: boolean;
  events: CalendarEvent[];
}

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  location?: string;
  start: Date;
  end: Date;
  allDay: boolean;
  color: string;
}
