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
      requiredRoles: [
        UserRole.SUPERUSER,
        UserRole.ADMIN,
        UserRole.MANAGER,
        UserRole.WORKER,
        UserRole.USER,
      ],
    },
    {
      label: 'Clients',
      icon: 'traders',
      route: '/clients',
      requiredRoles: [
        UserRole.SUPERUSER,
        UserRole.ADMIN,
        UserRole.MANAGER,
        UserRole.WORKER,
        UserRole.USER,
      ],
    },

    {
      label: 'Clients',
      icon: 'traders',
      route: '/affiliate-clients',
      requiredRoles: [UserRole.AFFILIATE],
    },
    {
      label: 'Affiliates',
      icon: 'affiliates',
      route: '/affiliates',
      requiredRoles: [
        UserRole.SUPERUSER,
        UserRole.ADMIN,
        UserRole.MANAGER,
        UserRole.WORKER,
        UserRole.USER,
      ],
    },
    {
      label: 'Leads',
      icon: 'leads',
      route: '/leads',
      requiredRoles: [
        UserRole.SUPERUSER,
        UserRole.ADMIN,
        UserRole.MANAGER,
        UserRole.WORKER,
        UserRole.USER,
      ],
    },
    {
      label: 'Workers',
      icon: 'workers',
      route: '/workers',
      requiredRoles: [UserRole.SUPERUSER, UserRole.ADMIN],
    },
    {
      label: 'Support',
      icon: 'support',
      route: '/communications',
      requiredRoles: [
        UserRole.SUPERUSER,
        UserRole.ADMIN,
        UserRole.MANAGER,
        UserRole.WORKER,
        UserRole.USER,
      ],
    },
    {
      label: 'Chat',
      icon: 'chat',
      route: '/employee-chat',
      requiredRoles: [
        UserRole.SUPERUSER,
        UserRole.ADMIN,
        UserRole.MANAGER,
        UserRole.WORKER,
        UserRole.USER,
      ],
    },
    {
      label: 'Tickets',
      icon: 'tickets',
      route: '/tickets',
      requiredRoles: [
        UserRole.SUPERUSER,
        UserRole.ADMIN,
        UserRole.MANAGER,
        UserRole.WORKER,
        UserRole.USER,
      ],
    },
    {
      label: 'Calendar',
      icon: 'calendar',
      route: '/calendar',
      requiredRoles: [
        UserRole.SUPERUSER,
        UserRole.ADMIN,
        UserRole.MANAGER,
        UserRole.WORKER,
        UserRole.USER,
      ],
    },

    {
      label: 'Documents',
      icon: 'documents',
      route: '/documents',
      requiredRoles: [
        UserRole.SUPERUSER,
        UserRole.ADMIN,
        UserRole.MANAGER,
        UserRole.WORKER,
        UserRole.USER,
      ],
    },
    {
      label: 'API Docs',
      icon: 'api',
      route: '/api-docs',
      requiredRoles: [UserRole.AFFILIATE, UserRole.SUPERUSER],
    },
    {
      label: 'KYC',
      icon: 'kyc',
      route: '/kyc-verification',
      requiredRoles: [UserRole.LEAD, UserRole.CLIENT, UserRole.SUPERUSER],
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
