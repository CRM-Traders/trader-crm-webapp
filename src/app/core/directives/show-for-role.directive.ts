import {
  Directive,
  Input,
  OnDestroy,
  TemplateRef,
  ViewContainerRef,
  inject,
  effect,
} from '@angular/core';
import { AuthService } from '../services/auth.service';

@Directive({
  selector: '[showForRole]',
  standalone: true,
})
export class ShowForRoleDirective implements OnDestroy {
  private authService = inject(AuthService);
  private templateRef = inject(TemplateRef<any>);
  private viewContainer = inject(ViewContainerRef);
  private hasView = false;
  private allowedRoles: string[] = [];
  private elseTemplateRef: TemplateRef<any> | null = null;

  // Effect to react to userRole signal changes
  private roleEffect = effect(() => {
    const userRole = this.authService.userRole();
    const matchesRole = userRole && this.allowedRoles.includes(userRole);

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

  @Input() set showForRole(roles: string | string[]) {
    this.allowedRoles = Array.isArray(roles) ? roles : [roles];
  }

  @Input() set showForRoleElse(templateRef: TemplateRef<any>) {
    this.elseTemplateRef = templateRef;
  }

  ngOnDestroy(): void {
    // Clean up the effect
    this.roleEffect.destroy();
  }
}
