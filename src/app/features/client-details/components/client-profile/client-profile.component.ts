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

@Component({
  selector: 'app-client-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="max-w-6xl mx-auto">
      <div class="mb-6">
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Client Profile
        </h2>
        <p class="text-gray-600 dark:text-gray-400">
          Manage client personal information and address details
        </p>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <!-- Personal Information Form -->
        <div
          class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
        >
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
              Personal Information
            </h3>
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
              </div>
            </div>

            <!-- Gender & Date of Birth -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >Gender</label
                >
                <select
                  formControlName="gender"
                  [disabled]="!isEditingPersonal"
                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  [class.bg-gray-50]="!isEditingPersonal"
                  [class.dark:bg-gray-800]="!isEditingPersonal"
                >
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
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
            </div>

            <!-- Language & Time Zone -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                >
                  <option value="">Select Language</option>
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                  <option value="it">Italian</option>
                </select>
              </div>
              <div>
                <label
                  class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >Time Zone</label
                >
                <select
                  formControlName="timeZone"
                  [disabled]="!isEditingPersonal"
                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  [class.bg-gray-50]="!isEditingPersonal"
                  [class.dark:bg-gray-800]="!isEditingPersonal"
                >
                  <option value="">Select Time Zone</option>
                  <option value="UTC">UTC</option>
                  <option value="EST">Eastern Standard Time</option>
                  <option value="PST">Pacific Standard Time</option>
                  <option value="CET">Central European Time</option>
                </select>
              </div>
            </div>

            <!-- KYC Status -->
            <div>
              <label
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >KYC Status</label
              >
              <div class="flex items-center space-x-4">
                <span
                  class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                >
                  <svg
                    class="w-4 h-4 mr-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    ></path>
                  </svg>
                  Pending Verification
                </span>
                <button
                  type="button"
                  class="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-medium"
                >
                  Update Status
                </button>
              </div>
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
                    <button
                      type="button"
                      class="ml-2 text-gray-400 hover:text-gray-600"
                    >
                      <svg
                        class="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        ></path>
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        ></path>
                      </svg>
                    </button>
                  </label>
                  <input
                    type="tel"
                    formControlName="phone"
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
                    Email Address
                    <button
                      type="button"
                      class="ml-2 text-gray-400 hover:text-gray-600"
                    >
                      <svg
                        class="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        ></path>
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        ></path>
                      </svg>
                    </button>
                  </label>
                  <input
                    type="email"
                    formControlName="email"
                    [readonly]="!isEditingPersonal"
                    class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    [class.bg-gray-50]="!isEditingPersonal"
                    [class.dark:bg-gray-800]="!isEditingPersonal"
                  />
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
                class="px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                (click)="savePersonalInfo()"
                class="px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>

        <!-- Address Information Form -->
        <div
          class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
        >
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
              Address Information
            </h3>
            <button
              type="button"
              *ngIf="!isEditingAddress"
              (click)="startEditAddress()"
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

          <form [formGroup]="addressForm" class="space-y-6">
            <!-- Country & City -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Country <span class="text-red-500">*</span>
                </label>
                <select
                  formControlName="country"
                  [disabled]="!isEditingAddress"
                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  [class.bg-gray-50]="!isEditingAddress"
                  [class.dark:bg-gray-800]="!isEditingAddress"
                >
                  <option value="">Select Country</option>
                  <option value="US">United States</option>
                  <option value="UK">United Kingdom</option>
                  <option value="CA">Canada</option>
                  <option value="AU">Australia</option>
                  <option value="DE">Germany</option>
                  <option value="FR">France</option>
                </select>
              </div>
              <div>
                <label
                  class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  City <span class="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  formControlName="city"
                  [readonly]="!isEditingAddress"
                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  [class.bg-gray-50]="!isEditingAddress"
                  [class.dark:bg-gray-800]="!isEditingAddress"
                />
              </div>
            </div>

            <!-- PO Box & Post Code -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >PO Box</label
                >
                <input
                  type="text"
                  formControlName="poBox"
                  [readonly]="!isEditingAddress"
                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  [class.bg-gray-50]="!isEditingAddress"
                  [class.dark:bg-gray-800]="!isEditingAddress"
                />
              </div>
              <div>
                <label
                  class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >Post Code</label
                >
                <input
                  type="text"
                  formControlName="postCode"
                  [readonly]="!isEditingAddress"
                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  [class.bg-gray-50]="!isEditingAddress"
                  [class.dark:bg-gray-800]="!isEditingAddress"
                />
              </div>
            </div>

            <!-- Full Address -->
            <div>
              <label
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >Full Address</label
              >
              <textarea
                formControlName="fullAddress"
                [readonly]="!isEditingAddress"
                rows="3"
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none"
                [class.bg-gray-50]="!isEditingAddress"
                [class.dark:bg-gray-800]="!isEditingAddress"
                placeholder="Enter full address..."
              ></textarea>
            </div>

            <!-- Action Buttons for Address -->
            <div
              *ngIf="isEditingAddress"
              class="flex justify-end space-x-3 pt-4"
            >
              <button
                type="button"
                (click)="cancelEditAddress()"
                class="px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                (click)="saveAddressInfo()"
                class="px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
              >
                Save Changes
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

  personalForm: FormGroup;
  addressForm: FormGroup;
  isEditingPersonal = false;
  isEditingAddress = false;

  constructor() {
    this.personalForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      gender: [''],
      dateOfBirth: [''],
      language: [''],
      timeZone: [''],
      phone: [''],
      email: ['', [Validators.email]],
    });

    this.addressForm = this.fb.group({
      country: ['', Validators.required],
      city: ['', Validators.required],
      poBox: [''],
      postCode: [''],
      fullAddress: [''],
    });
  }

  ngOnInit(): void {
    this.initializeForms();
  }

  private initializeForms(): void {
    if (this.client) {
      this.personalForm.patchValue({
        firstName: this.client.firstName,
        lastName: this.client.lastName,
        gender: 'male', // Mock data
        dateOfBirth: this.client.dateOfBirth
          ? new Date(this.client.dateOfBirth).toISOString().split('T')[0]
          : '',
        language: this.client.language || 'en',
        timeZone: 'EST', // Mock data
        phone: this.client.telephone || '',
        email: this.client.email,
      });

      this.addressForm.patchValue({
        country: this.client.country || '',
        city: 'New York', // Mock data
        poBox: '', // Mock data
        postCode: '10001', // Mock data
        fullAddress: '123 Main Street, New York, NY 10001', // Mock data
      });
    }
  }

  startEditPersonal(): void {
    this.isEditingPersonal = true;
  }

  cancelEditPersonal(): void {
    this.isEditingPersonal = false;
    this.initializeForms();
  }

  savePersonalInfo(): void {
    if (this.personalForm.valid) {
      // Implement save logic here
      this.alertService.success('Personal information updated successfully');
      this.isEditingPersonal = false;
    } else {
      this.alertService.error('Please fill in all required fields');
    }
  }

  startEditAddress(): void {
    this.isEditingAddress = true;
  }

  cancelEditAddress(): void {
    this.isEditingAddress = false;
    this.initializeForms();
  }

  saveAddressInfo(): void {
    if (this.addressForm.valid) {
      this.alertService.success('Address information updated successfully');
      this.isEditingAddress = false;
    } else {
      this.alertService.error('Please fill in all required fields');
    }
  }
}
