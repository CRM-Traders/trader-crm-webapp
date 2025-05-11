import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject } from 'rxjs';

export type ThemeMode = 'light' | 'dark' | 'system';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private platformId = inject(PLATFORM_ID);
  private readonly THEME_KEY = 'app-theme-preference';

  private themeSubject = new BehaviorSubject<ThemeMode>(this.getInitialTheme());
  currentTheme$ = this.themeSubject.asObservable();

  private isDarkModeSubject = new BehaviorSubject<boolean>(this.isDarkMode());
  isDarkMode$ = this.isDarkModeSubject.asObservable();

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.applyTheme(this.getInitialTheme());
      this.listenForSystemPreferenceChanges();
    }
  }

  setTheme(theme: ThemeMode): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.themeSubject.next(theme);
    localStorage.setItem(this.THEME_KEY, theme);
    this.applyTheme(theme);
  }

  toggleTheme(): void {
    const currentTheme = this.themeSubject.value;

    if (currentTheme === 'system') {
      this.setTheme(this.isDarkMode() ? 'light' : 'dark');
    } else {
      this.setTheme(currentTheme === 'dark' ? 'light' : 'dark');
    }
  }

  private applyTheme(theme: ThemeMode): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const root = document.documentElement;
    const isDark =
      theme === 'dark' || (theme === 'system' && this.isSystemDarkMode());

    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    this.isDarkModeSubject.next(isDark);
  }

  private getInitialTheme(): ThemeMode {
    if (!isPlatformBrowser(this.platformId)) return 'light';

    const savedTheme = localStorage.getItem(this.THEME_KEY) as ThemeMode | null;
    return savedTheme || 'system';
  }

  private isDarkMode(): boolean {
    if (!isPlatformBrowser(this.platformId)) return false;

    const currentTheme = this.getInitialTheme();
    return (
      currentTheme === 'dark' ||
      (currentTheme === 'system' && this.isSystemDarkMode())
    );
  }

  private isSystemDarkMode(): boolean {
    if (!isPlatformBrowser(this.platformId)) return false;

    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  private listenForSystemPreferenceChanges(): void {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    mediaQuery.addEventListener('change', () => {
      if (this.themeSubject.value === 'system') {
        this.applyTheme('system');
      }
    });
  }
}
