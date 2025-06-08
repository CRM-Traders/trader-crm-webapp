import { Component, inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { AlertService } from '../../../../core/services/alert.service';
import { ModalRef } from '../../../../shared/models/modals/modal.model';
import { WorkerRegistrationDto } from '../../models/worker.model';
import { WorkersService } from '../../services/workers.service';

interface UserRole {
  value: number;
  label: string;
}

interface RegistrationResponse {
  username: string;
  email: string;
  password?: string; // Present when password was auto-generated
}

@Component({
  selector: 'app-worker-registration-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="w-full">
      <!-- Modal Header -->
      <div class="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
        <h4 class="text-xl font-semibold text-gray-900 dark:text-white">
          Register New Worker
        </h4>
      </div>

      <!-- Modal Body -->
      <div class="px-6 py-6">
        <!-- Success Message with Generated Password -->
        <div
          *ngIf="generatedPassword"
          class="mb-6 p-4 bg-green-50/5 dark:bg-green-900/5 border border-green-200/10 dark:border-green-800/10 rounded-lg"
        >
          <div class="flex items-center mb-2">
            <svg
              class="w-5 h-5 text-green-600 dark:text-green-400 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              ></path>
            </svg>
            <h5 class="text-sm font-medium text-green-800 dark:text-green-500">
              Worker Registered Successfully
            </h5>
          </div>
          <p class="text-sm text-green-800 dark:text-green-400 mb-3">
            A password has been generated for the new worker. Please copy and
            securely share this password:
          </p>
          <div class="flex items-center space-x-2">
            <input
              type="text"
              readonly
              [value]="generatedPassword"
              class="flex-1 px-3 py-2 bg-white dark:bg-gray-800/30 border border-green-300 dark:border-green-600/5 rounded-md text-sm font-mono text-gray-900 dark:text-gray-100"
            />
            <button
              type="button"
              (click)="copyPassword()"
              class="px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              {{ passwordCopied ? 'Copied!' : 'Copy' }}
            </button>
          </div>
        </div>

        <form
          [formGroup]="registrationForm"
          class="space-y-4"
          *ngIf="!generatedPassword"
        >
          <!-- First Name and Last Name Row -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                for="firstName"
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                First Name <span class="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="firstName"
                formControlName="firstName"
                class="w-full px-3 py-2 border rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                [class.border-red-500]="
                  registrationForm.get('firstName')?.invalid &&
                  registrationForm.get('firstName')?.touched
                "
                [class.focus:ring-red-500]="
                  registrationForm.get('firstName')?.invalid &&
                  registrationForm.get('firstName')?.touched
                "
              />
              <p
                class="mt-1 text-sm text-red-600 dark:text-red-400"
                *ngIf="
                  registrationForm.get('firstName')?.invalid &&
                  registrationForm.get('firstName')?.touched
                "
              >
                <span
                  *ngIf="registrationForm.get('firstName')?.errors?.['required']"
                  >First name is required</span
                >
              </p>
            </div>

            <div>
              <label
                for="lastName"
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Last Name <span class="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="lastName"
                formControlName="lastName"
                class="w-full px-3 py-2 border rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                [class.border-red-500]="
                  registrationForm.get('lastName')?.invalid &&
                  registrationForm.get('lastName')?.touched
                "
                [class.focus:ring-red-500]="
                  registrationForm.get('lastName')?.invalid &&
                  registrationForm.get('lastName')?.touched
                "
              />
              <p
                class="mt-1 text-sm text-red-600 dark:text-red-400"
                *ngIf="
                  registrationForm.get('lastName')?.invalid &&
                  registrationForm.get('lastName')?.touched
                "
              >
                <span
                  *ngIf="registrationForm.get('lastName')?.errors?.['required']"
                  >Last name is required</span
                >
              </p>
            </div>
          </div>

          <!-- Email and Username Row -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                for="email"
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Email <span class="text-red-500">*</span>
              </label>
              <input
                type="email"
                id="email"
                formControlName="email"
                class="w-full px-3 py-2 border rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                [class.border-red-500]="
                  registrationForm.get('email')?.invalid &&
                  registrationForm.get('email')?.touched
                "
                [class.focus:ring-red-500]="
                  registrationForm.get('email')?.invalid &&
                  registrationForm.get('email')?.touched
                "
              />
              <p
                class="mt-1 text-sm text-red-600 dark:text-red-400"
                *ngIf="
                  registrationForm.get('email')?.invalid &&
                  registrationForm.get('email')?.touched
                "
              >
                <span
                  *ngIf="registrationForm.get('email')?.errors?.['required']"
                  >Email is required</span
                >
                <span *ngIf="registrationForm.get('email')?.errors?.['email']"
                  >Please enter a valid email</span
                >
              </p>
            </div>

            <div>
              <label
                for="username"
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Username <span class="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="username"
                formControlName="username"
                class="w-full px-3 py-2 border rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                [class.border-red-500]="
                  registrationForm.get('username')?.invalid &&
                  registrationForm.get('username')?.touched
                "
                [class.focus:ring-red-500]="
                  registrationForm.get('username')?.invalid &&
                  registrationForm.get('username')?.touched
                "
              />
              <p
                class="mt-1 text-sm text-red-600 dark:text-red-400"
                *ngIf="
                  registrationForm.get('username')?.invalid &&
                  registrationForm.get('username')?.touched
                "
              >
                <span
                  *ngIf="registrationForm.get('username')?.errors?.['required']"
                  >Username is required</span
                >
              </p>
            </div>
          </div>

          <!-- Role and Phone Number Row -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                for="role"
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Role <span class="text-red-500">*</span>
              </label>
              <select
                id="role"
                formControlName="role"
                class="w-full px-3 py-2 border rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                [class.border-red-500]="
                  registrationForm.get('role')?.invalid &&
                  registrationForm.get('role')?.touched
                "
                [class.focus:ring-red-500]="
                  registrationForm.get('role')?.invalid &&
                  registrationForm.get('role')?.touched
                "
              >
                <option value="" disabled>Select a role</option>
                <option *ngFor="let role of userRoles" [value]="role.value">
                  {{ role.label }}
                </option>
              </select>
              <p
                class="mt-1 text-sm text-red-600 dark:text-red-400"
                *ngIf="
                  registrationForm.get('role')?.invalid &&
                  registrationForm.get('role')?.touched
                "
              >
                <span *ngIf="registrationForm.get('role')?.errors?.['required']"
                  >Role is required</span
                >
              </p>
            </div>

            <div>
              <label
                for="phoneNumber"
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Phone Number <span class="text-red-500">*</span>
              </label>
              <input
                type="tel"
                id="phoneNumber"
                formControlName="phoneNumber"
                class="w-full px-3 py-2 border rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                [class.border-red-500]="
                  registrationForm.get('phoneNumber')?.invalid &&
                  registrationForm.get('phoneNumber')?.touched
                "
                [class.focus:ring-red-500]="
                  registrationForm.get('phoneNumber')?.invalid &&
                  registrationForm.get('phoneNumber')?.touched
                "
              />
              <p
                class="mt-1 text-sm text-red-600 dark:text-red-400"
                *ngIf="
                  registrationForm.get('phoneNumber')?.invalid &&
                  registrationForm.get('phoneNumber')?.touched
                "
              >
                <span
                  *ngIf="registrationForm.get('phoneNumber')?.errors?.['required']"
                  >Phone number is required</span
                >
              </p>
            </div>
          </div>

          <!-- Password Field (Optional) -->
          <div>
            <label
              for="password"
              class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Password
              <span class="text-gray-500 text-xs"
                >(Optional - will be generated if not provided)</span
              >
            </label>
            <input
              type="password"
              id="password"
              formControlName="password"
              placeholder="Leave empty to generate automatically"
              class="w-full px-3 py-2 border rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              [class.border-red-500]="
                registrationForm.get('password')?.invalid &&
                registrationForm.get('password')?.touched
              "
              [class.focus:ring-red-500]="
                registrationForm.get('password')?.invalid &&
                registrationForm.get('password')?.touched
              "
            />
            <p
              class="mt-1 text-sm text-red-600 dark:text-red-400"
              *ngIf="
                registrationForm.get('password')?.invalid &&
                registrationForm.get('password')?.touched
              "
            >
              <span
                *ngIf="registrationForm.get('password')?.errors?.['minlength']"
                >Password must be at least 6 characters</span
              >
            </p>
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
              If no password is provided, a secure password will be generated
              automatically
            </p>
          </div>
        </form>
      </div>

      <!-- Modal Footer -->
      <div
        class="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3"
      >
        <button
          *ngIf="!generatedPassword"
          type="button"
          class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          (click)="onCancel()"
        >
          Cancel
        </button>
        <button
          *ngIf="!generatedPassword"
          type="button"
          class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          (click)="onSubmit()"
          [disabled]="registrationForm.invalid || isSubmitting"
        >
          <span class="flex items-center">
            <svg
              *ngIf="isSubmitting"
              class="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              ></circle>
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            {{ isSubmitting ? 'Registering...' : 'Register Worker' }}
          </span>
        </button>
        <button
          *ngIf="generatedPassword"
          type="button"
          class="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
          (click)="onClose()"
        >
          Close
        </button>
      </div>
    </div>
  `,
  styles: [],
})
export class WorkerRegistrationModalComponent {
  @Input() modalRef!: ModalRef;

  private fb = inject(FormBuilder);
  private workersService = inject(WorkersService);
  private alertService = inject(AlertService);

  isSubmitting = false;
  registrationForm: FormGroup;
  generatedPassword: string | null = null;
  passwordCopied = false;

  userRoles: UserRole[] = [
    { value: 1, label: 'User' },
    { value: 2, label: 'Manager' },
    { value: 3, label: 'Admin' },
    { value: 4, label: 'SuperUser' },
    { value: 8, label: 'Worker' },
  ];

  constructor() {
    this.registrationForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      username: ['', Validators.required],
      role: ['', Validators.required],
      password: ['', [Validators.minLength(6)]], // Removed required validator
      phoneNumber: ['', Validators.required],
    });
  }

  onSubmit() {
    if (this.registrationForm.invalid) {
      Object.keys(this.registrationForm.controls).forEach((key) => {
        this.registrationForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.isSubmitting = true;
    const formValue = this.registrationForm.value;

    // Prepare the worker data
    const workerData: WorkerRegistrationDto = {
      firstName: formValue.firstName,
      lastName: formValue.lastName,
      email: formValue.email,
      username: formValue.username,
      role: Number.parseInt(formValue.role),
      phoneNumber: formValue.phoneNumber,
      // Only include password if it's provided
      ...(formValue.password && { password: formValue.password }),
    };

    this.workersService.registerWorker(workerData).subscribe({
      next: (response: RegistrationResponse) => {
        this.isSubmitting = false;

        // Check if a password was generated (response includes password field)
        if (response.password) {
          this.generatedPassword = response.password;
          this.alertService.success(
            'Worker registered successfully! A password has been generated.'
          );
        } else {
          this.alertService.success('Worker registered successfully!');
          this.modalRef.close(true);
        }
      },
      error: (error) => {
        this.isSubmitting = false;
        if (error.status === 400) {
          this.alertService.error(
            'Invalid data provided. Please check your inputs.'
          );
        } else if (error.status === 409) {
          this.alertService.error(
            'A worker with this email or username already exists.'
          );
        } else {
          this.alertService.error(
            'Failed to register worker. Please try again.'
          );
        }
      },
    });
  }

  async copyPassword() {
    if (!this.generatedPassword) return;

    try {
      await navigator.clipboard.writeText(this.generatedPassword);
      this.passwordCopied = true;
      this.alertService.success('Password copied to clipboard!');

      // Reset the copied state after 3 seconds
      setTimeout(() => {
        this.passwordCopied = false;
      }, 3000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = this.generatedPassword;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);

      this.passwordCopied = true;
      this.alertService.success('Password copied to clipboard!');

      setTimeout(() => {
        this.passwordCopied = false;
      }, 3000);
    }
  }

  onCancel() {
    this.modalRef.dismiss();
  }

  onClose() {
    this.modalRef.close(true);
  }
}
