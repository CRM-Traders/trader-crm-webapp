import { Directive, Input, OnDestroy, TemplateRef, ViewContainerRef, inject } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Directive({
  selector: '[showForRole]',
  standalone: true
})
export class ShowForRoleDirective implements OnDestroy {
  private authService = inject(AuthService);
  private templateRef = inject(TemplateRef<any>);
  private viewContainer = inject(ViewContainerRef);
  private destroy$ = new Subject<void>();
  private hasView = false;
  
  private elseTemplateRef: TemplateRef<any> | null = null;
  
  @Input() set showForRole(roles: string | string[]) {
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    
    this.authService.userRole$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(userRole => {
      const matchesRole = userRole && allowedRoles.includes(userRole);
      
      if (matchesRole && !this.hasView) {
        this.viewContainer.clear();
        this.viewContainer.createEmbeddedView(this.templateRef);
        this.hasView = true;
      } else if (!matchesRole && this.hasView) {
        this.viewContainer.clear();
        
        if (this.elseTemplateRef) {
          this.viewContainer.createEmbeddedView(this.elseTemplateRef);
        }
        
        this.hasView = false;
      }
    });
  }
  
  @Input() set showForRoleElse(templateRef: TemplateRef<any>) {
    this.elseTemplateRef = templateRef;
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}