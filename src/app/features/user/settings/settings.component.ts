import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService } from '../../../core/services/theme.service';
import { RouterModule } from '@angular/router';

import { ProfileSettingsComponent } from './components/profile-settings/profile-settings.component';
import { AppearanceSettingsComponent } from './components/appearance-settings/appearance-settings.component';
import { PasswordSettingsComponent } from './components/password-settings/password-settings.component';
import { SecuritySettingsComponent } from './components/security-settings/security-settings.component';
import { NotificationSettingsComponent } from './components/notification-settings/notification-settings.component';
import { LocalizationSettingsComponent } from './components/localization-settings/localization-settings.component';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ProfileSettingsComponent,
    AppearanceSettingsComponent,
    PasswordSettingsComponent,
    SecuritySettingsComponent,
    NotificationSettingsComponent,
    LocalizationSettingsComponent,
  ],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
})
export class SettingsComponent implements OnInit {
  private themeService = inject(ThemeService);

  activeSection = 'profile';
  isDarkMode = false;

  ngOnInit(): void {
    this.themeService.isDarkMode$.subscribe((isDark) => {
      this.isDarkMode = isDark;
    });
  }

  setActiveSection(section: string): void {
    this.activeSection = section;
  }
}
