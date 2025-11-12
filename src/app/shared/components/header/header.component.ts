import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
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
import { BrandService } from '../../../features/brand-selection/services/brand.service';
import { Office } from '../../../features/brand-selection/models/brand.model';
import { catchError, finalize, of } from 'rxjs';

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
  private brandService = inject(BrandService);

  public environment = environment;
  userRole = this.authService.userRole;
  isUserMenuOpen = false;
  currentTime = '';

  // Chat-related properties
  unreadChatCount = 0;
  isLoadingChatCount = false;

  // Office dropdown properties
  readonly offices = signal<Office[]>([]);
  readonly currentOffice = signal<Office | null>(null);
  readonly isOfficeDropdownOpen = signal<boolean>(false);
  readonly isLoadingOffices = signal<boolean>(false);
  readonly isSwitchingOffice = signal<boolean>(false);

  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.updateTime();
    interval(1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.updateTime());

    this.initializeChatCount();
    this.loadOffices();

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
    this.chatStateService.toggleChatContainer();
  }

  private initializeChatCount(): void {
    this.isLoadingChatCount = true;

    this.chatService
      .initializeConnection()
      .then(() => {
        return Promise.all([
          this.chatService.loadChats(ChatSection.Client),
          this.chatService.loadChats(ChatSection.Operator),
        ]);
      })
      .then(() => {
        this.isLoadingChatCount = false;
      })
      .catch((error) => {
        console.error('❌ Failed to initialize chat:', error);
        this.isLoadingChatCount = false;
      });

    this.chatService.unreadCount
      .pipe(takeUntil(this.destroy$))
      .subscribe((count) => {
        this.unreadChatCount = count;
      });
  }

  // Office dropdown methods
  loadOffices(): void {
    this.isLoadingOffices.set(true);

    this.brandService
      .getBrandsSwitch()
      .pipe(
        catchError(() => {
          return of({
            items: [],
            totalCount: 0,
            pageIndex: 0,
            pageSize: 50,
            totalPages: 0,
            hasPreviousPage: false,
            hasNextPage: false,
          });
        }),
        finalize(() => this.isLoadingOffices.set(false))
      )
      .subscribe((response) => {
        this.offices.set(response.items || []);

        // ✅ Get current office name from service
        const currentOfficeName = this.brandService.getCurrentOfficeName();

        if (currentOfficeName && response.items) {
          // Find office by name
          const current = response.items.find(
            (office) => office.value === currentOfficeName
          );
          this.currentOffice.set(current || response.items[0] || null);
        } else if (response.items && response.items.length > 0) {
          // Set first office as default
          this.currentOffice.set(response.items[0]);
        }
      });
  }

  toggleOfficeDropdown(event: MouseEvent): void {
    event.stopPropagation();
    this.isOfficeDropdownOpen.set(!this.isOfficeDropdownOpen());
  }

  selectOffice(office: Office, event: MouseEvent): void {
    event.stopPropagation();

    if (this.isSwitchingOffice() || office.id === this.currentOffice()?.id) {
      return;
    }

    this.isSwitchingOffice.set(true);
    this.isOfficeDropdownOpen.set(false);

    this.brandService
      .setBrandId(office.id, office.value) // ✅ Pass office name to service
      .pipe(
        catchError(() => {
          return of(null);
        }),
        finalize(() => {
          this.isSwitchingOffice.set(false);
        })
      )
      .subscribe((response: any) => {
        if (response) {
          this.authService.handleAuthResponse(response);
          this.currentOffice.set(office);

          // Reload the page to refresh all data with new office context
          window.location.reload();
        }
      });
  }

  trackByOfficeId(index: number, office: Office): string {
    return office.id;
  }
}
