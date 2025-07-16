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
      permission: 151,
    },
    {
      label: 'Hierarchy',
      icon: 'hierarchy',
      route: '/hierarchy',
      permission: 152,
    },
    {
      label: 'Offices',
      icon: 'offices',
      route: '/offices',
      permission: 153,
    },
    {
      label: 'Brands',
      icon: 'brands',
      route: '/brands',
      permission: 154,
    },
    {
      label: 'Desks',
      icon: 'desks',
      route: '/desks',
      permission: 155,
    },
    {
      label: 'Teams',
      icon: 'teams',
      route: '/teams',
      permission: 156,
    },
    {
      label: 'Sales Rules',
      icon: 'salerule',
      route: '/salerules',
      permission: 157,
    },
    {
      label: 'Clients',
      icon: 'traders',
      route: '/clients',
      permission: 158,
    },
    {
      label: 'Affiliates',
      icon: 'affiliates',
      route: '/affiliates',
      permission: 188,
    },
    {
      label: 'Leads',
      icon: 'leads',
      route: '/leads',
      permission: 159,
    },
    {
      label: 'Operators',
      icon: 'operator',
      route: '/operators',
      permission: 160,
    },
    {
      label: 'Calendar',
      icon: 'calendar',
      route: '/calendar',
      permission: 161,
    },
    {
      label: 'Documents',
      icon: 'documents',
      route: '/documents',
      permission: 163,
    },
    {
      label: 'Sources',
      icon: 'sources',
      route: '/sources',
      permission: 162,
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
