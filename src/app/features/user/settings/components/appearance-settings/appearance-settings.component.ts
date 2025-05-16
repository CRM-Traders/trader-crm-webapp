import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ThemeService,
  ThemeMode,
} from '../../../../../core/services/theme.service';
import { ThemeSelectorComponent } from '../../../../../shared/components/theme-selector/theme-selector.component';

@Component({
  selector: 'app-appearance-settings',
  standalone: true,
  imports: [CommonModule, ThemeSelectorComponent],
  templateUrl: './appearance-settings.component.html',
  styleUrls: ['./appearance-settings.component.scss'],
})
export class AppearanceSettingsComponent implements OnInit {
  private themeService = inject(ThemeService);

  isDarkMode = false;
  currentTheme: ThemeMode = 'system';

  ngOnInit(): void {
    this.themeService.isDarkMode$.subscribe((isDark) => {
      this.isDarkMode = isDark;
    });

    this.themeService.currentTheme$.subscribe((theme) => {
      this.currentTheme = theme;
    });
  }
}
