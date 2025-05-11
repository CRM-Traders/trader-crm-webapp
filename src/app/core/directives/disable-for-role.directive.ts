import { Directive, ElementRef, Input, OnDestroy, Renderer2, inject } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Directive({
  selector: '[disableForRole]',
  standalone: true
})
export class DisableForRoleDirective implements OnDestroy {
  private authService = inject(AuthService);
  private element = inject(ElementRef);
  private renderer = inject(Renderer2);
  private destroy$ = new Subject<void>();
  
  @Input() set disableForRole(roles: string | string[]) {
    const requiredRoles = Array.isArray(roles) ? roles : [roles];
    
    this.authService.userRole$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(userRole => {
      const hasRequiredRole = userRole && requiredRoles.includes(userRole);
      
      if (!hasRequiredRole) {
        this.renderer.setAttribute(this.element.nativeElement, 'disabled', 'true');
        this.renderer.addClass(this.element.nativeElement, 'disabled-by-role');
      } else {
        this.renderer.removeAttribute(this.element.nativeElement, 'disabled');
        this.renderer.removeClass(this.element.nativeElement, 'disabled-by-role');
      }
    });
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}