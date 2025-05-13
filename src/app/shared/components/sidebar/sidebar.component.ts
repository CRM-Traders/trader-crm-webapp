import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  inject,
  Input,
  OnInit,
  Renderer2,
  ViewEncapsulation,
} from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { HasRoleDirective } from '../../../core/directives/has-role.directive';
import { NavItem } from '../../../core/models/nav-item.model';
import { NavigationService } from '../../../core/services/navigation.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, HasRoleDirective],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class SidebarComponent implements OnInit {
  private navService = inject(NavigationService);
  private elementRef = inject(ElementRef);
  private renderer = inject(Renderer2);
  public router = inject(Router);

  @Input() expanded = true;
  navItems: NavItem[] = [];

  ngOnInit(): void {
    this.navItems = this.navService.getNavigationItems();

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
