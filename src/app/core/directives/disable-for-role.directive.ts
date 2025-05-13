import {
  Directive,
  ElementRef,
  Input,
  OnDestroy,
  Renderer2,
  inject,
  effect,
} from '@angular/core';
import { AuthService } from '../services/auth.service';

@Directive({
  selector: '[disableForRole]',
  standalone: true,
})
export class DisableForRoleDirective implements OnDestroy {
  private authService = inject(AuthService);
  private element = inject(ElementRef);
  private renderer = inject(Renderer2);
  private requiredRoles: string[] = [];

  // Effect to react to userRole signal changes
  private roleEffect = effect(() => {
    const userRole = this.authService.userRole();
    const hasRequiredRole = userRole && this.requiredRoles.includes(userRole);

    if (!hasRequiredRole) {
      this.renderer.setAttribute(
        this.element.nativeElement,
        'disabled',
        'true'
      );
      this.renderer.addClass(this.element.nativeElement, 'disabled-by-role');
    } else {
      this.renderer.removeAttribute(this.element.nativeElement, 'disabled');
      this.renderer.removeClass(this.element.nativeElement, 'disabled-by-role');
    }
  });

  @Input() set disableForRole(roles: string | string[]) {
    this.requiredRoles = Array.isArray(roles) ? roles : [roles];
  }

  ngOnDestroy(): void {
    // Clean up the effect
    this.roleEffect.destroy();
  }
}
