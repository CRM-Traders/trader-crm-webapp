import { Injectable } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { BehaviorSubject, Observable, filter } from 'rxjs';
import { UserRole } from '../models/roles.model';
import { NavItem } from '../models/nav-item.model';

@Injectable({
  providedIn: 'root',
})
export class NavigationService {
  private currentPageSubject = new BehaviorSubject<string>('');
  currentPage$ = this.currentPageSubject.asObservable();

  private expandedSubject = new BehaviorSubject<boolean>(true);
  expanded$ = this.expandedSubject.asObservable();

  private navigationItems: NavItem[] = [
    {
      label: 'Dashboard',
      icon: 'dashboard',
      route: '/dashboard',
      requiredRoles: [UserRole.SuperAdmin],
    },
    {
      label: 'Hierarchy',
      icon: 'hierarchy',
      route: '/hierarchy',
      requiredRoles: [UserRole.SuperAdmin],
    },
    {
      label: 'Brands',
      icon: 'brands',
      route: '/brands',
      requiredRoles: [UserRole.SuperAdmin],
    },
    {
      label: 'offices',
      icon: 'offices',
      route: '/offices',
      requiredRoles: [UserRole.SuperAdmin],
    },
    {
      label: 'Desks',
      icon: 'desks',
      route: '/desks',
      requiredRoles: [UserRole.SuperAdmin],
    },
    {
      label: 'Teams',
      icon: 'teams',
      route: '/teams',
      requiredRoles: [UserRole.SuperAdmin],
    },
    {
      label: 'Sales Rules',
      icon: 'salerule',
      route: '/salerules',
      requiredRoles: [UserRole.SuperAdmin],
    },
    {
      label: 'Clients',
      icon: 'traders',
      route: '/clients',
      requiredRoles: [UserRole.SuperAdmin],
    },
    {
      label: 'Affiliates',
      icon: 'affiliates',
      route: '/affiliates',
      requiredRoles: [UserRole.SuperAdmin],
    },
    {
      label: 'Leads',
      icon: 'leads',
      route: '/leads',
      requiredRoles: [UserRole.SuperAdmin],
    },
    {
      label: 'Operators',
      icon: 'operator',
      route: '/operators',
      requiredRoles: [UserRole.SuperAdmin],
    },
    {
      label: 'Calendar',
      icon: 'calendar',
      route: '/calendar',
      requiredRoles: [UserRole.SuperAdmin],
    },
    {
      label: 'Documents',
      icon: 'documents',
      route: '/documents',
      requiredRoles: [UserRole.SuperAdmin],
    },
    {
      label: 'Sources',
      icon: 'sources',
      route: '/sources',
      requiredRoles: [UserRole.SuperAdmin],
    },
  ];

  constructor(private router: Router) {
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        const url = event.urlAfterRedirects;
        this.updateCurrentPage(url);
      });
  }

  getNavigationItems(): NavItem[] {
    return this.navigationItems;
  }

  getIconByName(icon: string): string {
    return `/icons/${icon}.svg`;
  }

  toggleSidebar(): void {
    this.expandedSubject.next(!this.expandedSubject.value);
  }

  private updateCurrentPage(url: string): void {
    const baseRoute = '/' + url.split('/')[1];
    this.currentPageSubject.next(baseRoute);
  }
}
