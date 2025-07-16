import { Directive, TemplateRef, ViewContainerRef, Input } from '@angular/core';
import { AuthService } from '../services/auth.service';

@Directive({
  selector: '[hasPermission]',
  standalone: true,
})
export class HasPermissionDirective {
  private hasView = false;

  constructor(
    private templateRef: TemplateRef<any>,
    private vcr: ViewContainerRef,
    private authService: AuthService
  ) {}

  @Input() set hasPermission(permissionIndex: number) {
    if (this.authService.hasPermission(permissionIndex)) {
      if (!this.hasView) {
        this.vcr.createEmbeddedView(this.templateRef);
        this.hasView = true;
      }
    } else {
      if (this.hasView) {
        this.vcr.clear();
        this.hasView = false;
      }
    }
  }
}
