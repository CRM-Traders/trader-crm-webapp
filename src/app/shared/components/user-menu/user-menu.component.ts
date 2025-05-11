import {
  Component,
  inject,
  OnInit,
  OnDestroy,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-user-menu',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user-menu.component.html',
  styleUrl: './user-menu.component.scss',
})
export class UserMenuComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);

  isMenuOpen = false;
  userRole = '';
  userInitials = 'U';

  ngOnInit(): void {
    this.authService.userRole$.subscribe((role) => {
      this.userRole = role;
      this.userInitials = this.generateInitials(role);
    });
  }

  ngOnDestroy(): void {}

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
