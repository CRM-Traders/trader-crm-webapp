import { CommonModule } from '@angular/common';
import {
  Component,
  OnInit,
  ViewChildren,
  QueryList,
  ElementRef,
  inject,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ThemeToggleComponent } from '../../../shared/components/theme-toggle/theme-toggle.component';

@Component({
  selector: 'app-two-factor',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ThemeToggleComponent],
  templateUrl: './two-factor.component.html',
  styleUrl: './two-factor.component.scss',
})
export class TwoFactorComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  @ViewChildren('codeInput') codeInputs!: QueryList<ElementRef>;

  twoFactorForm: FormGroup = this.fb.group({
    digit1: ['', [Validators.required, Validators.pattern('[0-9]')]],
    digit2: ['', [Validators.required, Validators.pattern('[0-9]')]],
    digit3: ['', [Validators.required, Validators.pattern('[0-9]')]],
    digit4: ['', [Validators.required, Validators.pattern('[0-9]')]],
    digit5: ['', [Validators.required, Validators.pattern('[0-9]')]],
    digit6: ['', [Validators.required, Validators.pattern('[0-9]')]],
  });

  isLoading = false;
  errorMessage = '';
  returnUrl = '/dashboard';

  ngOnInit(): void {
    this.returnUrl =
      this.route.snapshot.queryParams['returnUrl'] || '/dashboard';

    this.twoFactorForm.valueChanges.subscribe((value) => {
      const allFieldsFilled = Object.values(value).every((val) => val !== '');

      if (allFieldsFilled && this.twoFactorForm.valid) {
        setTimeout(() => this.onSubmit(), 300);
      }
    });
  }

  onDigitInput(event: any, index: number) {
    const input = event.target as HTMLInputElement;
    const value = input.value;

    if (value.length > 1) {
      input.value = value.charAt(0);
    }

    if (value && index < 5) {
      this.codeInputs.get(index + 1)?.nativeElement.focus();
    }

    if (event.key === 'Backspace' && !value && index > 0) {
      this.codeInputs.get(index - 1)?.nativeElement.focus();
    }
  }

  onPaste(event: ClipboardEvent) {
    event.preventDefault();

    const pastedData = event.clipboardData?.getData('text') || '';
    const digits = pastedData.replace(/\D/g, '').substring(0, 6).split('');

    digits.forEach((digit, index) => {
      if (index < 6) {
        const controlName = `digit${
          index + 1
        }` as keyof typeof this.twoFactorForm.controls;
        this.twoFactorForm.get(controlName.toString())?.setValue(digit);
      }
    });

    const emptyIndex = digits.length < 6 ? digits.length : 5;
    if (emptyIndex < 6) {
      this.codeInputs.get(emptyIndex)?.nativeElement.focus();
    }
  }

  onSubmit(): void {
    if (this.twoFactorForm.invalid) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const code = Object.values(this.twoFactorForm.value).join('');
  }

  resetForm(): void {
    this.twoFactorForm.reset();
    setTimeout(() => {
      this.codeInputs.first?.nativeElement.focus();
    }, 100);
  }
}
