import { Injectable } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { BehaviorSubject, filter } from 'rxjs';
import { UserPermission } from '../models/roles.model';
import { NavItem } from '../models/nav-item.model';

@Injectable({
  providedIn: 'root',
})
export class NavigationService {
  private currentPageSubject = new BehaviorSubject<string>('');
  currentPage$ = this.currentPageSubject.asObservable();

  private expandedSubject = new BehaviorSubject<boolean>(false);
  expanded$ = this.expandedSubject.asObservable();

  private navigationItems: NavItem[] = [
    {
      label: 'Dashboard',
      icon: 'dashboard',
      route: '/dashboard',
      permission: 120,
    },
    {
      label: 'Hierarchy',
      icon: 'hierarchy',
      route: '/hierarchy',
      permission: 121,
    },
    {
      label: 'Offices',
      icon: 'offices',
      route: '/offices',
      permission: 122,
    },
    {
      label: 'Brands',
      icon: 'brands',
      route: '/brands',
      permission: 123,
    },
    {
      label: 'Desks',
      icon: 'desks',
      route: '/desks',
      permission: 124,
    },
    {
      label: 'Teams',
      icon: 'teams',
      route: '/teams',
      permission: 125,
    },
    {
      label: 'Sales Rules',
      icon: 'salerule',
      route: '/salerules',
      permission: 126,
    },
    {
      label: 'Clients',
      icon: 'traders',
      route: '/clients',
      permission: 127,
    },
    {
      label: 'Affiliates',
      icon: 'affiliates',
      route: '/affiliates',
      permission: 128,
    },
    {
      label: 'Leads',
      icon: 'leads',
      route: '/leads',
      permission: 129,
    },
    {
      label: 'Operators',
      icon: 'operator',
      route: '/operators',
      permission: 130,
    },
    {
      label: 'Calendar',
      icon: 'calendar',
      route: '/calendar',
      permission: 131,
    },
    {
      label: 'Documents',
      icon: 'documents',
      route: '/documents',
      permission: 132,
    },
    {
      label: 'Sources',
      icon: 'sources',
      route: '/sources',
      permission: 133,
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
