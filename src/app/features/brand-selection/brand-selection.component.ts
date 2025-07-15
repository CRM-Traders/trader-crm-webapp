import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { catchError, finalize, of } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { ThemeToggleComponent } from '../../shared/components/theme-toggle/theme-toggle.component';
import { Office } from './models/brand.model';
import { BrandService } from './services/brand.service';

@Component({
  selector: 'app-brand-selection',
  standalone: true,
  imports: [CommonModule, ThemeToggleComponent],
  template: `
    <div
      class="min-h-screen bg-white dark:bg-gray-900 flex flex-col justify-center py-12 px-6 transition-colors"
    >
      <div class="absolute top-4 right-4">
        <app-theme-toggle></app-theme-toggle>
      </div>

      <div class="max-w-4xl mx-auto">
        <div class="text-center mb-8">
          <h1
            class="text-3xl font-extrabold text-gray-900 dark:text-white mb-4"
          >
            Select Your Office
          </h1>
          <p class="text-lg text-gray-600 dark:text-gray-300">
            Choose the office you want to work with to continue to your
            dashboard
          </p>
        </div>

        <!-- Loading State -->
        <div *ngIf="isLoading()" class="flex justify-center items-center py-12">
          <div class="flex flex-col items-center space-y-4">
            <svg
              class="animate-spin h-12 w-12 text-blue-600 dark:text-blue-400"
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
            <p class="text-gray-600 dark:text-gray-300">Loading offices...</p>
          </div>
        </div>

        <!-- Error State -->
        <div *ngIf="!isLoading() && errorMessage()" class="max-w-md mx-auto">
          <div
            class="bg-red-100 border border-red-400 text-red-800 dark:bg-red-900 dark:text-red-300 rounded-lg p-4 mb-6"
          >
            <div class="flex items-center">
              <svg class="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fill-rule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clip-rule="evenodd"
                ></path>
              </svg>
              <span>{{ errorMessage() }}</span>
            </div>
          </div>
          <div class="text-center">
            <button
              (click)="loadBrands()"
              class="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>

        <!-- Office Grid -->
        <div
          *ngIf="!isLoading() && !errorMessage() && brands().length > 0"
          class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          <div
            *ngFor="let brand of brands(); trackBy: trackByBrandId"
            class="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer border-2 border-transparent hover:border-blue-500 dark:hover:border-blue-400"
            [class.opacity-50]="
              isSelectingBrand() && selectedBrandId() !== brand.id
            "
            [class.border-blue-500]="selectedBrandId() === brand.id"
            [class.dark:border-blue-400]="selectedBrandId() === brand.id"
            (click)="selectBrand(brand)"
          >
            <div class="p-6">
              <div class="flex items-center justify-between mb-4">
                <div
                  class="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center"
                >
                  <svg
                    class="w-6 h-6 text-white"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1z"
                      clip-rule="evenodd"
                    ></path>
                  </svg>
                </div>
                <div
                  *ngIf="selectedBrandId() === brand.id && isSelectingBrand()"
                  class="text-blue-500 dark:text-blue-400"
                >
                  <svg
                    class="animate-spin h-5 w-5"
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
                </div>
              </div>

              <h3
                class="text-lg font-semibold text-gray-900 dark:text-white mb-2"
              >
                {{ brand.value }}
              </h3>

              <p class="text-sm text-gray-600 dark:text-gray-300 mb-4">
                Office ID: {{ brand.id }}
              </p>

              <div class="flex items-center justify-between">
                <span
                  class="text-sm font-medium text-blue-600 dark:text-blue-400"
                >
                  Click to select
                </span>
                <svg
                  class="w-5 h-5 text-gray-400 dark:text-gray-500"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fill-rule="evenodd"
                    d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                    clip-rule="evenodd"
                  ></path>
                </svg>
              </div>
            </div>
          </div>
        </div>

        <!-- No Brands State -->
        <div
          *ngIf="!isLoading() && !errorMessage() && brands().length === 0"
          class="text-center py-12"
        >
          <svg
            class="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            ></path>
          </svg>
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No offices available
          </h3>
          <p class="text-gray-600 dark:text-gray-300 mb-4">
            There are no offices assigned to your account. Please contact your
            administrator.
          </p>
          <button
            (click)="logout()"
            class="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:bg-red-500 dark:hover:bg-red-600 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  `,
})
export class BrandSelectionComponent implements OnInit {
  private brandService = inject(BrandService);
  private authService = inject(AuthService);
  private router = inject(Router);

  // Reactive state using signals
  readonly isLoading = signal<boolean>(true);
  readonly isSelectingBrand = signal<boolean>(false);
  readonly brands = signal<Office[]>([]);
  readonly errorMessage = signal<string>('');
  readonly selectedBrandId = signal<string>('');

  ngOnInit(): void {
    // Check if user is authenticated
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/auth/login']);
      return;
    }

    this.loadBrands();
  }

  loadBrands(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.brandService
      .getBrands()
      .pipe(
        catchError((error) => {
          this.errorMessage.set('Failed to load brands. Please try again.');
          return of({
            items: [],
            totalCount: 0,
            pageIndex: 0,
            pageSize: 50,
            totalPages: 0,
            hasPreviousPage: false,
            hasNextPage: false,
          });
        }),
        finalize(() => this.isLoading.set(false))
      )
      .subscribe((response) => {
        this.brands.set(response.items || []);
      });
  }

  selectBrand(brand: Office): void {
    if (this.isSelectingBrand()) {
      return; // Prevent multiple selections
    }

    this.isSelectingBrand.set(true);
    this.selectedBrandId.set(brand.id);

    this.brandService
      .setBrandId(brand.id)
      .pipe(
        catchError((error) => {
          this.errorMessage.set('Failed to select brand. Please try again.');
          return of(null);
        }),
        finalize(() => {
          this.isSelectingBrand.set(false);
          this.selectedBrandId.set('');
        })
      )
      .subscribe((response) => {
        if (response) {
          // Update auth tokens if provided in response
          if (response.accessToken) {
            // The brand service should handle token updates if needed
            // For now, we'll just navigate to dashboard
          }

          // Navigate to dashboard
          this.router.navigate(['/dashboard']);
        }
      });
  }

  logout(): void {
    this.authService.logout();
  }

  trackByBrandId(index: number, brand: Office): string {
    return brand.id;
  }
}
