import { isPlatformBrowser } from '@angular/common';
import {
  Injectable,
  inject,
  PLATFORM_ID,
  signal,
  computed,
} from '@angular/core';
import { TimezoneOption } from '../models/timezone.model';

@Injectable({
  providedIn: 'root',
})
export class LocalizationService {
  private platformId = inject(PLATFORM_ID);
  private readonly TIMEZONE_KEY = 'trader-crm-timezone-preference';
  private readonly DEFAULT_TIMEZONE = 'UTC';

  private readonly _currentTimezone = signal<string>(this.getInitialTimezone());
  readonly currentTimezone = this._currentTimezone.asReadonly();

  readonly timezoneOffset = computed(() => {
    const timezone = this._currentTimezone();
    const option = this.getTimezoneOptions().find(
      (tz) => tz.value === timezone
    );
    return option ? option.offset : 0;
  });

  constructor() {}

  setTimezone(timezone: string): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this._currentTimezone.set(timezone);
    localStorage.setItem(this.TIMEZONE_KEY, timezone);
  }

  private getInitialTimezone(): string {
    if (!isPlatformBrowser(this.platformId)) return this.DEFAULT_TIMEZONE;

    const savedTimezone = localStorage.getItem(this.TIMEZONE_KEY);
    if (savedTimezone) return savedTimezone;

    try {
      return (
        Intl.DateTimeFormat().resolvedOptions().timeZone ||
        this.DEFAULT_TIMEZONE
      );
    } catch (e) {
      return this.DEFAULT_TIMEZONE;
    }
  }

  detectAndSetTimezone(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    try {
      const detectedZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (detectedZone) {
        this.setTimezone(detectedZone);
      }
    } catch (e) {
      console.warn('Could not auto-detect timezone');
    }
  }

  formatDate(date: Date, options: Intl.DateTimeFormatOptions = {}): string {
    const timezone = this._currentTimezone();
    const defaultOptions: Intl.DateTimeFormatOptions = {
      timeZone: timezone,
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
    };

    return new Intl.DateTimeFormat('en-US', {
      ...defaultOptions,
      ...options,
    }).format(date);
  }

  formatTime(date: Date, options: Intl.DateTimeFormatOptions = {}): string {
    const timezone = this._currentTimezone();
    const defaultOptions: Intl.DateTimeFormatOptions = {
      timeZone: timezone,
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: true,
    };

    return new Intl.DateTimeFormat('en-US', {
      ...defaultOptions,
      ...options,
    }).format(date);
  }

  toLocalTime(date: Date): Date {
    const offset = this.timezoneOffset();
    const utcDate = new Date(date.getTime() + date.getTimezoneOffset() * 60000);
    return new Date(utcDate.getTime() + offset * 60000);
  }

  getCurrentLocalTime(): Date {
    return this.toLocalTime(new Date());
  }

  getTimezoneOptions(): TimezoneOption[] {
    return [
      {
        name: 'UTC (Coordinated Universal Time)',
        value: 'UTC',
        abbr: 'UTC',
        offset: 0,
        region: 'Global',
      },
      {
        name: 'London, Edinburgh (GMT)',
        value: 'Europe/London',
        abbr: 'GMT',
        offset: 0,
        region: 'Europe',
      },
      {
        name: 'Paris, Berlin, Rome (CET)',
        value: 'Europe/Paris',
        abbr: 'CET',
        offset: 60,
        region: 'Europe',
      },
      {
        name: 'Athens, Istanbul, Helsinki (EET)',
        value: 'Europe/Athens',
        abbr: 'EET',
        offset: 120,
        region: 'Europe',
      },
      {
        name: 'Moscow, St. Petersburg (MSK)',
        value: 'Europe/Moscow',
        abbr: 'MSK',
        offset: 180,
        region: 'Europe',
      },
      {
        name: 'New York, Toronto (EST/EDT)',
        value: 'America/New_York',
        abbr: 'ET',
        offset: -300,
        region: 'North America',
      },
      {
        name: 'Chicago, Mexico City (CST/CDT)',
        value: 'America/Chicago',
        abbr: 'CT',
        offset: -360,
        region: 'North America',
      },
      {
        name: 'Denver, Calgary (MST/MDT)',
        value: 'America/Denver',
        abbr: 'MT',
        offset: -420,
        region: 'North America',
      },
      {
        name: 'Los Angeles, Vancouver (PST/PDT)',
        value: 'America/Los_Angeles',
        abbr: 'PT',
        offset: -480,
        region: 'North America',
      },
      {
        name: 'Tokyo, Seoul (JST/KST)',
        value: 'Asia/Tokyo',
        abbr: 'JST',
        offset: 540,
        region: 'Asia',
      },
      {
        name: 'Sydney, Melbourne (AEST/AEDT)',
        value: 'Australia/Sydney',
        abbr: 'AEST',
        offset: 600,
        region: 'Australia',
      },
      {
        name: 'Hong Kong, Singapore, Beijing (CST)',
        value: 'Asia/Hong_Kong',
        abbr: 'CST',
        offset: 480,
        region: 'Asia',
      },
      {
        name: 'Dubai, Abu Dhabi (GST)',
        value: 'Asia/Dubai',
        abbr: 'GST',
        offset: 240,
        region: 'Middle East',
      },
      {
        name: 'São Paulo, Rio de Janeiro (BRT)',
        value: 'America/Sao_Paulo',
        abbr: 'BRT',
        offset: -180,
        region: 'South America',
      },
      {
        name: 'Mumbai, New Delhi (IST)',
        value: 'Asia/Kolkata',
        abbr: 'IST',
        offset: 330,
        region: 'Asia',
      },
    ];
  }

  getTimezoneOptionsByRegion(): Record<string, TimezoneOption[]> {
    const options = this.getTimezoneOptions();
    return options.reduce((groups, option) => {
      if (!groups[option.region]) {
        groups[option.region] = [];
      }
      groups[option.region].push(option);
      return groups;
    }, {} as Record<string, TimezoneOption[]>);
  }
}
