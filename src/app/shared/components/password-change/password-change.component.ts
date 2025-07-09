import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { AlertService } from '../../../core/services/alert.service';
import { ModalService } from '../../services/modals/modal.service';
import { UsersService } from '../../../features/client-details/services/user.service';

export interface PasswordChangeRequest {
  entityId: string;
  isClient: boolean;
  newPassword: string;
  confirmPassword: string;
}

export interface PasswordChangeData {
  entityId: string;
  entityType: 'client' | 'lead' | 'operator';
  entityName: string;
}

@Component({
  selector: 'app-password-change',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './password-change.component.html',
  styleUrls: ['./password-change.component.scss'],
})
export class PasswordChangeComponent implements OnInit {
  private fb = inject(FormBuilder);
  private alertService = inject(AlertService);
  private destroy$ = new Subject<void>();
  private modalService = inject(ModalService);
  private service = inject(UsersService);

  passwordForm: FormGroup;
  loading = false;
  showPassword = false;
  data: PasswordChangeData | null = null;

  constructor() {
    this.passwordForm = this.fb.group(
      {
        newPassword: ['', [Validators.required, Validators.minLength(8)]],
        confirmPassword: ['', [Validators.required]],
      },
      { validators: this.passwordMatchValidator }
    );
  }

  ngOnInit(): void {}

  set entityId(value: string) {
    if (!this.data) this.data = {} as PasswordChangeData;
    this.data.entityId = value;
  }

  set entityType(value: 'client' | 'lead' | 'operator') {
    if (!this.data) this.data = {} as PasswordChangeData;
    this.data.entityType = value;
  }

  set entityName(value: string) {
    if (!this.data) this.data = {} as PasswordChangeData;
    this.data.entityName = value;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  setData(data: PasswordChangeData): void {
    this.data = data;
  }

  passwordMatchValidator(form: FormGroup) {
    const newPassword = form.get('newPassword')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;
    return newPassword === confirmPassword ? null : { passwordMismatch: true };
  }

  generatePassword(): void {
    const length = 12;
    const charset =
      'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';

    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }

    this.passwordForm.patchValue({
      newPassword: password,
      confirmPassword: password,
    });
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  onSubmit(): void {
    if (this.passwordForm.invalid || !this.data) {
      this.alertService.error('Please fill in all required fields correctly');
      return;
    }

    const request: PasswordChangeRequest = {
      entityId: this.data.entityId,
      isClient: this.data.entityType === 'client',
      newPassword: this.passwordForm.value.newPassword,
      confirmPassword: this.passwordForm.value.confirmPassword,
    };

    this.loading = true;

    this.service.changePassword(request).subscribe((result: any) => {
      this.alertService.success(
        'Password change request submitted successfully'
      );
      this.loading = false;
      this.onCancel();
    });
  }

  onCancel(): void {
    this.modalService.closeAll();
  }

  getEntityTypeLabel(): string {
    if (!this.data) return '';

    switch (this.data.entityType) {
      case 'client':
        return 'Client';
      case 'lead':
        return 'Lead';
      case 'operator':
        return 'Operator';
      default:
        return 'User';
    }
  }
}
