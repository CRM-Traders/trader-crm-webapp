import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  inject,
  Input,
  OnInit,
  Renderer2,
  ViewEncapsulation,
  ChangeDetectorRef,
} from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { NavItem } from '../../../core/models/nav-item.model';
import { NavigationService } from '../../../core/services/navigation.service';
import { HasPermissionDirective } from '../../../core/directives/has-permission.directive';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, HasPermissionDirective],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class SidebarComponent implements OnInit {
  private navService = inject(NavigationService);
  private elementRef = inject(ElementRef);
  private renderer = inject(Renderer2);
  private cdr = inject(ChangeDetectorRef);
  public router = inject(Router);

  @Input() expanded = true;
  navItems: NavItem[] = [];

  ngOnInit(): void {
    this.navItems = this.navService.getNavigationItems();

    this.cdr.detectChanges();

    this.navService.expanded$.subscribe((expanded) => {
      this.expanded = expanded;

      setTimeout(() => {
        if (!expanded) {
          this.renderer.addClass(
            this.elementRef.nativeElement,
            'sidebar-collapsed'
          );
        } else {
          this.renderer.removeClass(
            this.elementRef.nativeElement,
            'sidebar-collapsed'
          );
        }
      }, 10);
    });
  }

  toggleSidebar(): void {
    this.navService.toggleSidebar();
  }

  hasNotification(item: NavItem): boolean {
    return item.label === 'Tickets' || item.label === 'Calendar';
  }

  getIconStyle(item: NavItem): any {
    if (this.router.isActive(item.route, false)) {
      return {
        filter:
          'invert(32%) sepia(96%) saturate(1868%) hue-rotate(218deg) brightness(97%) contrast(101%)',
      };
    }
    return {};
  }
}
