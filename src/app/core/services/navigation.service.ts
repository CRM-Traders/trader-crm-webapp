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
    // Overview
    {
      label: 'Dashboard',
      icon: 'dashboard',
      route: '/dashboard',
    },

    // Core Trading Operations
    {
      label: 'Trading Live',
      icon: 'traiding-live',
      route: '/trading-live',
    },
    {
      label: 'Trading Groups',
      icon: 'traiding-groups',
      route: '/trading-groups',
    },
    {
      label: 'Trading Server Positions',
      icon: 'trading-server-positions',
      route: '/trading-server-positions',
    },
    {
      label: 'Assets',
      icon: 'assets',
      route: '/assets',
    },

    // User Management
    {
      label: 'Clients',
      icon: 'traders',
      route: '/clients',
    },
    {
      label: 'Affiliates',
      icon: 'affiliates',
      route: '/affiliates',
    },
    {
      label: 'Leads',
      icon: 'leads',
      route: '/leads',
    },
    {
      label: 'Workers',
      icon: 'workers',
      route: '/workers',
    },

    // Analytics & Reporting
    {
      label: 'Analytics',
      icon: 'analytics',
      route: '/analytics',
    },

    // Communication & Support
    {
      label: 'Communications',
      icon: 'communications',
      route: '/communications',
    },
    {
      label: 'Tickets',
      icon: 'tickets',
      route: '/tickets',
    },
    {
      label: 'Calendar',
      icon: 'calendar',
      route: '/calendar',
    },

    {
      label: 'Documents',
      icon: 'documents',
      route: '/documents',
    },
    {
      label: 'API Docs',
      icon: 'api',
      route: '/api-docs',
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
