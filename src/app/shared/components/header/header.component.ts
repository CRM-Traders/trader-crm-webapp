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
import { ChatService } from '../../../features/chat/services/chat.service';
import { ChatStateService } from '../../../features/chat/services/chat-state.service';
import { ChatSection } from '../../../features/chat/models/chat.model';

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
  private chatStateService = inject(ChatStateService);

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

    // ✅ FIX: Initialize chat connection immediately
    this.initializeChatCount();

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
    // Toggle chat container visibility
    this.chatStateService.toggleChatContainer();
  }

  private initializeChatCount(): void {
    this.isLoadingChatCount = true;

    // ✅ FIX: Initialize chat connection and load all chats
    this.chatService
      .initializeConnection()
      .then(() => {
        console.log('✅ Chat connection initialized successfully');

        // ✅ Load all chats to get unread counts
        return Promise.all([
          this.chatService.loadChats(ChatSection.Client),
          this.chatService.loadChats(ChatSection.Operator),
        ]);
      })
      .then(() => {
        console.log('✅ All chats loaded successfully');
        this.isLoadingChatCount = false;
      })
      .catch((error) => {
        console.error('❌ Failed to initialize chat:', error);
        this.isLoadingChatCount = false;
      });

    // Subscribe to unread count updates
    this.chatService.unreadCount
      .pipe(takeUntil(this.destroy$))
      .subscribe((count) => {
        this.unreadChatCount = count;
        console.log('📬 Unread chat count updated:', count);
      });
  }
}
