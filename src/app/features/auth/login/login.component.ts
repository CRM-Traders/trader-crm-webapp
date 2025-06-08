import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ThemeToggleComponent } from '../../../shared/components/theme-toggle/theme-toggle.component';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { TwoFactorComponent } from '../two-factor/two-factor.component';
import { AuthResponse } from '../../../core/models/auth-response.model';
import { UserRole } from '../../../core/models/roles.model';

@Component({
  selector: 'app-login',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ThemeToggleComponent,
    TwoFactorComponent,
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  standalone: true,
})
export class LoginComponent {
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    rememberMe: [false],
  });

  isLoading = false;
  errorMessage = '';
  returnUrl = '/dashboard';
  sessionExpired = false;

  // 2FA related properties
  requiresTwoFactor = false;
  userId: string | null = null;

  ngOnInit(): void {
    this.returnUrl =
      this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
    this.sessionExpired =
      this.route.snapshot.queryParams['sessionExpired'] === 'true';
  }

  onSubmit() {
    if (this.loginForm.invalid) {
      this.markFormGroupTouched(this.loginForm);
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const { email, password, rememberMe } = this.loginForm.value;
    this.authService.login(email, password, null, rememberMe).subscribe(
      (result: any) => {
        if (result.requiresTwoFactor) {
          // Handle 2FA required
          this.requiresTwoFactor = true;
          this.userId = result.userId;
        } else if (result.accessToken) {
          // Login successful
          this.navigateByRole(result.role);
        }
        this.isLoading = false;
      },
      (error: any) => {
        this.errorMessage = 'Invalid credentials. Please try again.';
        this.isLoading = false;
      }
    );
  }

  onTwoFactorComplete(twoFactorCode: any) {
    if (!twoFactorCode) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const { email, password, rememberMe } = this.loginForm.value;
    this.authService
      .login(email, password, twoFactorCode, rememberMe)
      .subscribe(
        (result: any) => {
          if (result.accessToken) {
            this.navigateByRole(result.role);
          } else {
            this.errorMessage =
              'Two-factor authentication failed. Please try again.';
          }
          this.isLoading = false;
        },
        (error: any) => {
          this.errorMessage =
            'Two-factor authentication failed. Please try again.';
          this.isLoading = false;
        }
      );
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach((control) => {
      control.markAsTouched();
      if ((control as any).controls) {
        this.markFormGroupTouched(control as FormGroup);
      }
    });
  }

  private navigateByRole(role: string) {
    if (role === UserRole.AFFILIATE) {
      this.router.navigateByUrl('/affiliate-clients');
    } else if (role === UserRole.CLIENT || role === UserRole.LEAD) {
      this.router.navigateByUrl('/traiding-accounts');
    } else {
      this.router.navigateByUrl('/dashboard');
    }
  }
}
