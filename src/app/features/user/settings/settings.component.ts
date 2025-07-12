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
import { SettingsService } from './services/settings.service';
import { Settings } from './models/settings.model';
import { SecretsComponent } from './components/secrets/secrets.component';

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
    SecretsComponent,
  ],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
})
export class SettingsComponent implements OnInit {
  private themeService = inject(ThemeService);
  private settingsService = inject(SettingsService);

  activeSection = 'profile';
  isDarkMode = false;
  userSettings: Settings | null = null;
  isLoading = true;

  ngOnInit(): void {
    this.themeService.isDarkMode$.subscribe((isDark) => {
      this.isDarkMode = isDark;
    });

    this.loadUserSettings();
  }

  loadUserSettings(): void {
    this.isLoading = true;
    this.settingsService.getUserSettings().subscribe({
      next: (settings: Settings) => {
        console.log('Settings loaded:', settings);
        this.userSettings = settings;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading settings:', error);
        this.isLoading = false;
      },
    });
  }

  setActiveSection(section: string): void {
    this.activeSection = section;
  }
}
