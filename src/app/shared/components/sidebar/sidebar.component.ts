import { CommonModule } from '@angular/common';
import { Component, inject, Input } from '@angular/core';
import { RouterModule } from '@angular/router';
import { HasRoleDirective } from '../../../core/directives/has-role.directive';
import { NavItem } from '../../../core/models/nav-item.model';
import { NavigationService } from '../../../core/services/navigation.service';

@Component({
  selector: 'app-sidebar',
  imports: [CommonModule, RouterModule, HasRoleDirective],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
export class SidebarComponent {
  private navService = inject(NavigationService);

  @Input() expanded = true;
  navItems: NavItem[] = [];

  ngOnInit(): void {
    this.navItems = this.navService.getNavigationItems();
  }

  toggleSidebar(): void {
    this.navService.toggleSidebar();
  }
}
