import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  HostListener,
  Input,
  OnInit,
  Output,
  inject,
} from '@angular/core';
import { ThemeService } from '../../../core/services/theme.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-mini-calendar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mini-calendar.component.html',
  styleUrls: ['./mini-calendar.component.scss'],
})
export class MiniCalendarComponent implements OnInit {
  private themeService = inject(ThemeService);
  private router = inject(Router);

  @Input() showCurrentDate = true;
  @Output() dateSelected = new EventEmitter<Date>();

  isDarkMode = false;
  isOpen = false;
  currentDate = new Date();
  displayDate = new Date();
  selectedDate: Date | null = null;
  weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  calendarDays: MiniCalendarDay[] = [];

  ngOnInit(): void {
    this.themeService.isDarkMode$.subscribe((isDark) => {
      this.isDarkMode = isDark;
    });

    this.generateCalendarDays();
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
      });
    }
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
  }

  goToNextMonth(): void {
    this.displayDate = new Date(
      this.displayDate.getFullYear(),
      this.displayDate.getMonth() + 1,
      1
    );
    this.generateCalendarDays();
  }

  goToToday(): void {
    this.displayDate = new Date();
    this.generateCalendarDays();
  }

  selectDate(day: MiniCalendarDay): void {
    this.selectedDate = day.date;
    this.dateSelected.emit(day.date);
    this.isOpen = false;
  }

  navigateToCalendar(): void {
    this.router.navigate(['/calendar']);
  }

  toggleCalendar(event: MouseEvent): void {
    event.stopPropagation();
    this.isOpen = !this.isOpen;
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
  }

  formatCurrentDate(): string {
    return this.currentDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const targetElement = event.target as HTMLElement;
    const clickedInside = targetElement.closest('app-mini-calendar');

    if (!clickedInside && this.isOpen) {
      this.isOpen = false;
    }
  }
}

interface MiniCalendarDay {
  date: Date;
  day: number;
  isCurrentMonth: boolean;
  isToday: boolean;
}
