import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const brandSelectionGuard: CanActivateFn = (): boolean | UrlTree => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Check if user is authenticated
  if (!authService.isAuthenticated()) {
    return router.createUrlTree(['/auth/login']);
  }

  // Allow access to brand selection - this guard just ensures authentication
  return true;
};

export const dashboardGuard: CanActivateFn = (): boolean | UrlTree => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Check if user is authenticated
  if (!authService.isAuthenticated()) {
    return router.createUrlTree(['/auth/login']);
  }

  // Check if user has selected a brand
  if (!authService.hasSelectedBrand()) {
    return router.createUrlTree(['/auth/brand-selection']);
  }

  return true;
};
