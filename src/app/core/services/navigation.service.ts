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
      requiredRoles: [
        UserPermission.Finance_Manager,
        UserPermission.Finance_TeamLead,
        UserPermission.Finance_HOD,
      ],
    },
    {
      label: 'Hierarchy',
      icon: 'hierarchy',
      route: '/hierarchy',
      requiredRoles: [
        UserPermission.Finance_Manager,
        UserPermission.Finance_TeamLead,
        UserPermission.Finance_HOD,
      ],
    },
    {
      label: 'Offices',
      icon: 'offices',
      route: '/offices',
      requiredRoles: [
        UserPermission.Finance_Manager,
        UserPermission.Finance_TeamLead,
        UserPermission.Finance_HOD,
      ],
    },
    {
      label: 'Brands',
      icon: 'brands',
      route: '/brands',
      requiredRoles: [
        UserPermission.Finance_Manager,
        UserPermission.Finance_TeamLead,
        UserPermission.Finance_HOD,
      ],
    },
    {
      label: 'Desks',
      icon: 'desks',
      route: '/desks',
      requiredRoles: [
        UserPermission.Finance_Manager,
        UserPermission.Finance_TeamLead,
        UserPermission.Finance_HOD,
      ],
    },
    {
      label: 'Teams',
      icon: 'teams',
      route: '/teams',
      requiredRoles: [
        UserPermission.Finance_Manager,
        UserPermission.Finance_TeamLead,
        UserPermission.Finance_HOD,
      ],
    },
    {
      label: 'Sales Rules',
      icon: 'salerule',
      route: '/salerules',
      requiredRoles: [
        UserPermission.Finance_Manager,
        UserPermission.Finance_TeamLead,
        UserPermission.Finance_HOD,
      ],
    },
    {
      label: 'Clients',
      icon: 'traders',
      route: '/clients',
      requiredRoles: [
        UserPermission.Finance_Manager,
        UserPermission.Finance_TeamLead,
        UserPermission.Finance_HOD,
        UserPermission.Finance_Executive,
      ],
    },
    {
      label: 'Affiliates',
      icon: 'affiliates',
      route: '/affiliates',
      requiredRoles: [
        UserPermission.AffiliateManager_Executive,
        UserPermission.AffiliateManager_HOD,
        UserPermission.AffiliateManager_Manager,
        UserPermission.AffiliateManager_TeamLead,
      ],
    },
    {
      label: 'Leads',
      icon: 'leads',
      route: '/leads',
      requiredRoles: [
        UserPermission.Finance_Manager,
        UserPermission.Finance_TeamLead,
        UserPermission.Finance_HOD,
      ],
    },
    {
      label: 'Operators',
      icon: 'operator',
      route: '/operators',
      requiredRoles: [
        UserPermission.Finance_HOD,
        UserPermission.Finance_TeamLead,
        UserPermission.Finance_Manager,
      ],
    },
    {
      label: 'Calendar',
      icon: 'calendar',
      route: '/calendar',
      requiredRoles: [
        UserPermission.Finance_Manager,
        UserPermission.Finance_TeamLead,
        UserPermission.Finance_HOD,
        UserPermission.Finance_Executive,
      ],
    },
    {
      label: 'Documents',
      icon: 'documents',
      route: '/documents',
      requiredRoles: [
        UserPermission.Compliance,
        UserPermission.Compliance_Manager,
      ],
    },
    {
      label: 'Sources',
      icon: 'sources',
      route: '/sources',
      requiredRoles: [UserPermission.MrRobot],
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
