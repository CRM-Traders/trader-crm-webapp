import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { NavigationService } from '../../../core/services/navigation.service';
import { CommonModule } from '@angular/common';
import { ThemeToggleComponent } from '../theme-toggle/theme-toggle.component';
import { Subject, interval, takeUntil } from 'rxjs';

@Component({
  selector: 'app-header',
  imports: [CommonModule, ThemeToggleComponent],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private navService = inject(NavigationService);
  private router = inject(Router);

  userRole = '';
  isUserMenuOpen = false;
  currentTime = '';

  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.authService.userRole$.subscribe((role) => {
      this.userRole = role;
    });

    this.updateTime();

    interval(1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.updateTime());

    document.addEventListener('click', this.closeMenuOnClickOutside.bind(this));
  }

  ngOnDestroy(): void {
    document.removeEventListener(
      'click',
      this.closeMenuOnClickOutside.bind(this)
    );
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleSidebar(): void {
    this.navService.toggleSidebar();
  }

  toggleUserMenu(event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
    }
    this.isUserMenuOpen = !this.isUserMenuOpen;
  }

  logout(): void {
    this.authService.logout();
  }

  private closeMenuOnClickOutside(event: MouseEvent): void {
    if (this.isUserMenuOpen) {
      this.isUserMenuOpen = false;
    }
  }

  private updateTime(): void {
    const now = new Date();
    const hours = this.padZero(now.getHours());
    const minutes = this.padZero(now.getMinutes());
    const seconds = this.padZero(now.getSeconds());
    this.currentTime = `${hours}:${minutes}:${seconds}`;
  }

  private padZero(num: number): string {
    return num < 10 ? `0${num}` : `${num}`;
  }
}
