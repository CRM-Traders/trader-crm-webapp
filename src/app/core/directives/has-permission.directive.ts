import {
  Directive,
  OnDestroy,
  inject,
  TemplateRef,
  ViewContainerRef,
  effect,
  Input,
} from '@angular/core';
import { AuthService } from '../services/auth.service';

@Directive({
  selector: '[hasPermission]',
  standalone: true,
})
export class HasPermissionDirective implements OnDestroy {
  private authService = inject(AuthService);
  private templateRef = inject(TemplateRef<any>);
  private viewContainer = inject(ViewContainerRef);
  private hasView = false;
  private requiredPermissions: string[] = [];

  private permissionEffect = effect(() => {
    const userPermissions = this.authService.userPermissions();
    const hasPermission =
      userPermissions &&
      this.requiredPermissions.some((permission) =>
        userPermissions.includes(permission)
      );

    if (hasPermission && !this.hasView) {
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.hasView = true;
    } else if (!hasPermission && this.hasView) {
      this.viewContainer.clear();
      this.hasView = false;
    }
  });

  @Input() set hasPermission(permissions: string | string[]) {
    this.requiredPermissions = Array.isArray(permissions)
      ? permissions
      : [permissions];
  }

  ngOnDestroy(): void {
    this.permissionEffect.destroy();
  }
}
