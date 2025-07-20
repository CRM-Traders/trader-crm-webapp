import {
  Component,
  inject,
  OnInit,
  OnDestroy,
  HostListener,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { SettingsService } from '../../../features/user/settings/services/settings.service';
import { Settings } from '../../../features/user/settings/models/settings.model';

@Component({
  selector: 'app-user-menu',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user-menu.component.html',
  styleUrl: './user-menu.component.scss',
})
export class UserMenuComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private settingsService = inject(SettingsService);

  isMenuOpen = false;
  userRole = '';
  userName = '';
  userEmail = '';
  username = '';
  phoneNumber = '';
  userInitials = 'U';
  userSettings: Settings | null = null;

  // Effect to update user information when role or name changes
  private userInfoEffect = effect(() => {
    const role = this.authService.userRole();
    const name = this.authService.getName();
    this.userRole = role;
    this.userName = name;
    this.userInitials = this.generateInitials(name);  
  });

  ngOnInit(): void {
    this.userName = this.authService.getName();
    this.userInitials = this.generateInitials(this.userName);
    this.loadUserSettings();
  }

  ngOnDestroy(): void {
    // The effect is automatically cleaned up when component is destroyed
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const targetElement = event.target as HTMLElement;
    const clickedInside = targetElement.closest('app-user-menu');

    if (!clickedInside && this.isMenuOpen) {
      this.isMenuOpen = false;
    }
  }

  toggleMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.isMenuOpen = !this.isMenuOpen;
  }

  logout(): void {
    this.authService.logout();
  }

  private loadUserSettings(): void {
    this.settingsService.getUserSettings().subscribe({
      next: (settings: Settings) => {
        this.userSettings = settings;
        this.userName = `${settings.firstName} ${settings.lastName}`;
        this.userEmail = settings.email;
        this.username = settings.username;
        this.phoneNumber = settings.phoneNumber || '';
        this.userRole = settings.role;
        this.userInitials = this.generateInitials(this.userName);
      },
      error: (error) => {
        console.error('Failed to load user settings:', error);
        // Fallback to auth service data if settings fail to load
        this.userName = this.authService.getName();
        this.userRole = this.authService.userRole();
        this.userInitials = this.generateInitials(this.userName);
      }
    });
  }

  private generateInitials(text: string): string {
    if (!text) return 'U';

    if (text.length <= 5) return text.charAt(0).toUpperCase();

    const words = text.split(' ');
    if (words.length >= 2) {
      return (
        words[0].charAt(0) + words[words.length - 1].charAt(0)
      ).toUpperCase();
    }

    return text.substring(0, 2).toUpperCase();
  }
}
