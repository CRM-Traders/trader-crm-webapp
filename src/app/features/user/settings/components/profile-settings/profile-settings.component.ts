import { Component, Input, OnInit, OnChanges, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { AlertService } from '../../../../../core/services/alert.service';
import { Settings } from '../../models/settings.model';

@Component({
  selector: 'app-profile-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile-settings.component.html',
  styleUrls: ['./profile-settings.component.scss'],
})
export class ProfileSettingsComponent implements OnInit, OnChanges {
  @Input() settings: Settings | null = null;

  private fb = inject(FormBuilder);
  private alertService = inject(AlertService);

  profileForm!: FormGroup;
  isProfileSaving = false;

  ngOnInit(): void {
    this.initForm();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['settings'] && this.settings && this.profileForm) {
      this.populateFormWithSettings();
    }
  }

  initForm(): void {
    this.profileForm = this.fb.group({
      firstName: ['', [Validators.required]],
      lastName: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.pattern(/^\+?[0-9\s\-\(\)]+$/)]],
    });

    // If settings are already available, populate the form
    if (this.settings) {
      this.populateFormWithSettings();
    }
  }

  populateFormWithSettings(): void {
    if (!this.settings || !this.profileForm) return;

    console.log('Populating form with settings:', this.settings);

    this.profileForm.patchValue({
      firstName: this.settings.firstName || '',
      lastName: this.settings.lastName || '',
      email: this.settings.email || '',
      phone: this.settings.phoneNumber || '',
    });
  }

  saveProfileSettings(): void {
    if (this.profileForm.invalid) {
      this.markFormGroupTouched(this.profileForm);
      return;
    }

    this.isProfileSaving = true;

    setTimeout(() => {
      this.isProfileSaving = false;
      this.alertService.success('Profile settings updated successfully.');
    }, 1000);
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
