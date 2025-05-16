import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { AlertService } from '../../../../../core/services/alert.service';
import { LocalizationService } from '../../../../../core/services/localization.service';
import { TimezoneOption } from '../../../../../core/models/timezone.model';

@Component({
  selector: 'app-localization-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './localization-settings.component.html',
  styleUrls: ['./localization-settings.component.scss'],
})
export class LocalizationSettingsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private localizationService = inject(LocalizationService);
  private alertService = inject(AlertService);

  localizationForm!: FormGroup;
  isLocalizationSaving = false;
  timezones: TimezoneOption[] = [];
  timezonesByRegion: Record<string, TimezoneOption[]> = {};

  ngOnInit(): void {
    this.initForm();
    this.loadTimezones();
  }

  initForm(): void {
    this.localizationForm = this.fb.group({
      timezone: ['', [Validators.required]],
      dateFormat: ['MMM d, yyyy'],
      timeFormat: ['h:mm a'],
    });
  }

  loadTimezones(): void {
    this.timezones = this.localizationService.getTimezoneOptions();
    this.timezonesByRegion =
      this.localizationService.getTimezoneOptionsByRegion();
    this.localizationForm
      .get('timezone')
      ?.setValue(this.localizationService.currentTimezone());
  }

  getCurrentFormattedTime(): string {
    return this.localizationService.formatDate(new Date());
  }

  saveLocalizationSettings(): void {
    if (this.localizationForm.invalid) {
      this.markFormGroupTouched(this.localizationForm);
      return;
    }

    this.isLocalizationSaving = true;

    const timezone = this.localizationForm.get('timezone')?.value;
    this.localizationService.setTimezone(timezone);

    setTimeout(() => {
      this.isLocalizationSaving = false;
      this.alertService.success('Localization settings updated successfully.');
    }, 1000);
  }

  getObjectKeys(obj: any): string[] {
    return Object.keys(obj);
  }

  formatOffset(offset: number): string {
    const sign = offset >= 0 ? '+' : '-';
    const absOffset = Math.abs(offset);
    const hours = Math.floor(absOffset / 60);
    const minutes = absOffset % 60;
    return `${sign}${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}`;
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach((control) => {
      control.markAsTouched();
      if ((control as any).controls) {
        this.markFormGroupTouched(control as FormGroup);
      }
    });
  }
}
