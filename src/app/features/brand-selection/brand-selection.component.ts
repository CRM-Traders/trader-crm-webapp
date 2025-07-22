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
  templateUrl: './brand-selection.component.html',
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
      .getBrandsSwitch()
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
          this.errorMessage.set('Failed to select office. Please try again.');
          return of(null);
        }),
        finalize(() => {
          this.isSelectingBrand.set(false);
          this.selectedBrandId.set('');
        })
      )
      .subscribe((response: any) => {
        if (response) {
          this.authService.handleAuthResponse(response);

          this.router.navigate(['']);
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
