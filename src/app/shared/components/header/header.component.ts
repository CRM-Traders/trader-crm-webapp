import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { NavigationService } from '../../../core/services/navigation.service';
import { CommonModule } from '@angular/common';
import { ThemeToggleComponent } from '../theme-toggle/theme-toggle.component';
import { Subject, interval, takeUntil } from 'rxjs';
import { UserMenuComponent } from '../user-menu/user-menu.component';
import { MiniCalendarComponent } from '../mini-calendar/mini-calendar.component';
import { LocalizationService } from '../../../core/services/localization.service';
import { environment } from '../../../../environments/environment';
import { ChatService } from '../../services/chat/chat.service';

@Component({
  selector: 'app-header',
  imports: [
    CommonModule,
    ThemeToggleComponent,
    UserMenuComponent,
    MiniCalendarComponent,
  ],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private navService = inject(NavigationService);
  private localizationService = inject(LocalizationService);
  private router = inject(Router);
  private chatService = inject(ChatService);

  public environment = environment;
  userRole = this.authService.userRole;
  isUserMenuOpen = false;
  currentTime = '';

  // Chat-related properties
  unreadChatCount = 0;
  isLoadingChatCount = false;

  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.updateTime();
    interval(1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.updateTime());

    // Subscribe to unread chat count
    this.subscribeToUnreadCount();

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

  private subscribeToUnreadCount(): void {
    this.isLoadingChatCount = true;

    this.chatService.unreadCount$.pipe(takeUntil(this.destroy$)).subscribe({
      next: (count) => {
        this.unreadChatCount = count;
        this.isLoadingChatCount = false;
      },
      error: (error) => {
        console.error('Error loading unread count:', error);
        this.isLoadingChatCount = false;
      },
    });
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
    const now = this.localizationService.getCurrentLocalTime();

    const hours = this.padZero(now.getHours());
    const minutes = this.padZero(now.getMinutes());
    const seconds = this.padZero(now.getSeconds());
    this.currentTime = `${hours}:${minutes}:${seconds}`;
  }

  private padZero(num: number): string {
    return num < 10 ? `0${num}` : `${num}`;
  }

  swapOfficies() {
    this.router.navigate(['/auth/brand-selection']);
  }

  openChat(): void {
    this.router.navigate(['/chat']);
  }
}
