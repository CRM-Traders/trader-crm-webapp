import { Component, inject, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Client } from '../../../clients/models/clients.model';
import { AlertService } from '../../../../core/services/alert.service';
import { ClientsService } from '../../../clients/services/clients.service';
import { finalize, Observable } from 'rxjs';
import { UsersService } from '../../services/user.service';
import { Profile } from '../../models/profile';
import { CountryService } from '../../../../core/services/country.service';
import { LanguageService } from '../../../../core/services/language.service';
import { Country } from '../../../../core/models/country.model';
import { ModalService } from '../../../../shared/services/modals/modal.service';
import {
  PasswordChangeComponent,
  PasswordChangeData,
} from '../../../../shared/components/password-change/password-change.component';

@Component({
  selector: 'app-client-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="max-w-6xl mx-auto">
      <!-- Loading Spinner -->
      <div *ngIf="loading" class="flex justify-center items-center py-8">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>

      <div *ngIf="!loading" class="mb-6">
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Client Profile
        </h2>
        <p class="text-gray-600 dark:text-gray-400">
          Manage client personal information and address details
        </p>
      </div>

      <div *ngIf="!loading" class="">
        <!-- Personal Information Form -->
        <div
          class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
        >
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
              Personal Information
            </h3>
            <div class="flex space-x-3">
              <button
                type="button"
                *ngIf="!isEditingPersonal"
                (click)="openPasswordChangeModal()"
                class="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <svg
                  class="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                  ></path>
                </svg>
                Change Password
              </button>
              <button
                type="button"
                *ngIf="!isEditingPersonal"
                (click)="startEditPersonal()"
                class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <svg
                  class="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  ></path>
                </svg>
                Edit
              </button>
            </div>
          </div>

          <form [formGroup]="personalForm" class="space-y-6">
            <!-- First Name & Last Name -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  First Name <span class="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  formControlName="firstName"
                  [readonly]="!isEditingPersonal"
                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  [class.bg-gray-50]="!isEditingPersonal"
                  [class.dark:bg-gray-800]="!isEditingPersonal"
                />
                <div *ngIf="personalForm.get('firstName')?.invalid && personalForm.get('firstName')?.touched" 
                     class="text-red-500 text-sm mt-1">
                  First name is required
                </div>
              </div>
              <div>
                <label
                  class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Last Name <span class="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  formControlName="lastName"
                  [readonly]="!isEditingPersonal"
                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  [class.bg-gray-50]="!isEditingPersonal"
                  [class.dark:bg-gray-800]="!isEditingPersonal"
                />
                <div *ngIf="personalForm.get('lastName')?.invalid && personalForm.get('lastName')?.touched" 
                     class="text-red-500 text-sm mt-1">
                  Last name is required
                </div>
              </div>
            </div>

            <!-- Date of Birth & Language -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >Date of Birth</label
                >
                <input
                  type="date"
                  formControlName="dateOfBirth"
                  [readonly]="!isEditingPersonal"
                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  [class.bg-gray-50]="!isEditingPersonal"
                  [class.dark:bg-gray-800]="!isEditingPersonal"
                />
              </div>
              <div>
                <label
                  class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >Language</label
                >
                <select
                  formControlName="language"
                  [disabled]="!isEditingPersonal"
                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  [class.bg-gray-50]="!isEditingPersonal"
                  [class.dark:bg-gray-800]="!isEditingPersonal"
                  [class.cursor-not-allowed]="!isEditingPersonal"
                  [class.opacity-50]="!isEditingPersonal"
                >
                  <option value="">Select Language</option>
                  <option *ngFor="let language of languages" [value]="language.key">
                    {{ language.value }}
                  </option>
                </select>
              </div>
            </div>

            <!-- Country -->
            <div>
              <label
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Country
              </label>
              <select
                formControlName="country"
                [disabled]="!isEditingPersonal"
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                [class.bg-gray-50]="!isEditingPersonal"
                [class.dark:bg-gray-800]="!isEditingPersonal"
                [class.cursor-not-allowed]="!isEditingPersonal"
                [class.opacity-50]="!isEditingPersonal"
              >
                <option value="">Select Country</option>
                <option *ngFor="let country of countries$ | async" [value]="country.code">
                  {{ country.name }}
                </option>
              </select>
            </div>

            <!-- Contact Information -->
            <div class="border-t border-gray-200 dark:border-gray-700 pt-6">
              <h4
                class="text-md font-semibold text-gray-900 dark:text-white mb-4"
              >
                Contact Information
              </h4>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    formControlName="telephone"
                    [readonly]="!isEditingPersonal"
                    class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    [class.bg-gray-50]="!isEditingPersonal"
                    [class.dark:bg-gray-800]="!isEditingPersonal"
                  />
                </div>
                <div>
                  <label
                    class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Second Phone Number
                  </label>
                  <input
                    type="tel"
                    formControlName="secondTelephone"
                    [readonly]="!isEditingPersonal"
                    class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    [class.bg-gray-50]="!isEditingPersonal"
                    [class.dark:bg-gray-800]="!isEditingPersonal"
                  />
                </div>
              </div>

              <div class="mt-4">
                <label
                  class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Email Address <span class="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  formControlName="email"
                  [readonly]="!isEditingPersonal"
                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  [class.bg-gray-50]="!isEditingPersonal"
                  [class.dark:bg-gray-800]="!isEditingPersonal"
                />
                <div *ngIf="personalForm.get('email')?.invalid && personalForm.get('email')?.touched" 
                     class="text-red-500 text-sm mt-1">
                  <span *ngIf="personalForm.get('email')?.errors?.['required']">Email is required</span>
                  <span *ngIf="personalForm.get('email')?.errors?.['email']">Please enter a valid email</span>
                </div>
              </div>
            </div>

            <!-- Action Buttons for Personal Info -->
            <div
              *ngIf="isEditingPersonal"
              class="flex justify-end space-x-3 pt-4"
            >
              <button
                type="button"
                (click)="cancelEditPersonal()"
                [disabled]="savingPersonal"
                class="px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                (click)="savePersonalInfo()"
                [disabled]="savingPersonal || personalForm.invalid"
                class="px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors disabled:opacity-50 flex items-center"
              >
                <div *ngIf="savingPersonal" class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {{ savingPersonal ? 'Saving...' : 'Save Changes' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
      }
    `,
  ],
})
export class ClientProfileComponent implements OnInit {
  @Input() client!: Client;

  private fb = inject(FormBuilder);
  private alertService = inject(AlertService);
  private clientsService = inject(ClientsService);
  private userService = inject(UsersService);
  private countryService = inject(CountryService);
  private languageService = inject(LanguageService);
  private modalService = inject(ModalService);

  personalForm: FormGroup;
  isEditingPersonal = false;
  loading = true;
  savingPersonal = false;
  clientProfile?: Profile;
  
  // Data for dropdowns
  countries$: Observable<Country[]>;
  languages: Array<{ key: string; value: string }> = [];

  constructor() {
    this.personalForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      dateOfBirth: [''],
      language: [''],
      country: [''],
      telephone: [''],
      secondTelephone: [''],
      email: ['', [Validators.required, Validators.email]],
    });
    
    // Initialize dropdown data
    this.countries$ = this.countryService.getCountries();
    this.languages = this.languageService.getAllLanguages();
  }

  ngOnInit(): void {
    if (this.client.id) {
      this.loadClientData();
    }
  }

  private loadClientData(): void {
    this.loading = true;
    
    this.userService.getClient(this.client.id)
      .pipe(finalize(() => this.loading = false))
      .subscribe({
        next: (client) => {
          this.clientProfile = client;
          this.initializeForm(client);
        },
        error: (error) => {
          console.error('Error loading client data:', error);
          this.alertService.error('Failed to load client data');
        }
      });
  }

  private initializeForm(client: Profile): void {
    this.personalForm.patchValue({
      firstName: client.firstName || '',
      lastName: client.lastName || '',
      dateOfBirth: client.dateOfBirth 
        ? new Date(client.dateOfBirth).toISOString().split('T')[0] 
        : '',
      language: client.language || '',
      country: client.country || '',
      telephone: client.telephone || '',
      secondTelephone: client.secondTelephone || '',
      email: client.email || '',
    });
    
    // Disable form controls after initialization
    this.disableFormControls();
  }

  private enableFormControls(): void {
    this.personalForm.enable();
  }

  private disableFormControls(): void {
    this.personalForm.disable();
  }

  startEditPersonal(): void {
    this.isEditingPersonal = true;
    this.enableFormControls();
  }

  cancelEditPersonal(): void {
    this.isEditingPersonal = false;
    this.disableFormControls();
    if (this.clientProfile) {
      this.initializeForm(this.clientProfile);
    }
  }

  savePersonalInfo(): void {
    if (this.personalForm.invalid) {
      this.personalForm.markAllAsTouched();
      this.alertService.error('Please fill in all required fields correctly');
      return;
    }

    if (!this.client?.id) {
      this.alertService.error('Client ID is missing');
      return;
    }

    this.savingPersonal = true;
    const formData = this.personalForm.value;
    
    // Prepare the data for API call
    const updateData = {
      id: this.client.id,
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      telephone: formData.telephone,
      secondTelephone: formData.secondTelephone,
      country: formData.country,
      language: formData.language,
      dateOfBirth: formData.dateOfBirth ? new Date(formData.dateOfBirth).toISOString() : null,
    };

    this.userService.updateClient(updateData)
      .pipe(finalize(() => {
        this.savingPersonal = false;
      }))
      .subscribe({
        next: (updatedClient) => {
          this.clientProfile = updatedClient;
          this.initializeForm(updatedClient);
          this.isEditingPersonal = false;
          this.disableFormControls();
          this.alertService.success('Personal information updated successfully');
        },
        error: (error) => {
          console.error('Error updating client:', error);
          this.alertService.error('Failed to update client information');
        }
      });
  }

  openPasswordChangeModal(): void {
    const passwordChangeData: PasswordChangeData = {
      entityId: this.client.id,
      entityType: 'client',
      entityName: `${this.client.firstName} ${this.client.lastName}`,
    };

    const modalRef = this.modalService.open(
      PasswordChangeComponent,
      {
        size: 'md',
        centered: true,
        closable: true,
      },
      passwordChangeData
    );

    modalRef.result.then(
      (result) => {
        // Handle successful password change
        if (result) {
          this.alertService.success('Password changed successfully');
        }
      },
      () => {
        // Modal dismissed
      }
    );
  }
}