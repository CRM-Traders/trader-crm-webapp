import { Routes } from '@angular/router';
import { publicGuard } from './core/guards/public.guard';
import { authGuard, roleGuard } from './core/guards/auth.guard';
import { UserRole } from './core/models/roles.model';
import { brandSelectionGuard } from './core/guards/brand.guard';

export const routes: Routes = [
  {
    path: 'auth/login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then(
        (m) => m.LoginComponent
      ),
    canActivate: [publicGuard],
  },
  {
    path: 'auth/confirm/:id',
    loadComponent: () =>
      import('./features/auth/confirm-auth/confirm-auth.component').then(
        (m) => m.ConfirmAuthComponent
      ),
    canActivate: [publicGuard],
  },
  {
    path: 'auth/unauthorized',
    loadComponent: () =>
      import('./features/auth/unauthorized/unauthorized.component').then(
        (m) => m.UnauthorizedComponent
      ),
    canActivate: [authGuard],
  },
  {
    path: 'auth/brand-selection',
    loadComponent: () =>
      import('./features/brand-selection/brand-selection.component').then(
        (m) => m.BrandSelectionComponent
      ),
    canActivate: [brandSelectionGuard],
  },

  // Auth With Layout
  {
    path: '',
    loadComponent: () =>
      import('../app/shared/components/layout/layout.component').then(
        (m) => m.LayoutComponent
      ),
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then(
            (m) => m.DashboardComponent
          ),
        canActivate: [authGuard, roleGuard([UserRole.SuperAdmin])],
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./features/user/settings/settings.component').then(
            (m) => m.SettingsComponent
          ),
        canActivate: [authGuard],
      },
      {
        path: 'calendar',
        loadComponent: () =>
          import('./features/calendar-page/calendar-page.component').then(
            (m) => m.CalendarPageComponent
          ),
        canActivate: [authGuard, roleGuard([UserRole.SuperAdmin])],
      },
      {
        path: 'clients',
        loadComponent: () =>
          import('./features/clients/clients.component').then(
            (m) => m.ClientsComponent
          ),
        canActivate: [authGuard, roleGuard([UserRole.SuperAdmin])],
      },
      {
        path: 'clients/:id',
        loadComponent: () =>
          import('./features/client-details/client-details.component').then(
            (m) => m.ClientDetailsComponent
          ),
        canActivate: [authGuard, roleGuard([UserRole.SuperAdmin])],
      },
      {
        path: 'tickets',
        loadComponent: () =>
          import('./features/tickets/tickets.component').then(
            (m) => m.TicketsComponent
          ),
        canActivate: [authGuard, roleGuard([UserRole.SuperAdmin])],
      },
      {
        path: 'api-docs',
        loadComponent: () =>
          import(
            './features/affiliate-portal/api-docs/api-docs.component'
          ).then((m) => m.ApiDocsComponent),
        canActivate: [
          authGuard,
          roleGuard([UserRole.SuperAdmin, UserRole.SuperAdmin]),
        ],
      },
      {
        path: 'affiliate-clients',
        loadComponent: () =>
          import(
            './features/affiliate-portal/clients/affiliate-clients/affiliate-clients.component'
          ).then((m) => m.AffiliateClientsComponent),
        canActivate: [
          authGuard,
          roleGuard([
            UserRole.SuperAdmin,
            UserRole.Affiliate,
            UserRole.AffiliateManager,
          ]),
        ],
      },
      {
        path: 'affiliates',
        loadComponent: () =>
          import('./features/affiliates/affiliates.component').then(
            (m) => m.AffiliatesComponent
          ),
        canActivate: [authGuard, roleGuard([UserRole.SuperAdmin])],
      },
      {
        path: 'leads',
        loadComponent: () =>
          import('./features/leads/leads.component').then(
            (m) => m.LeadsComponent
          ),
        canActivate: [authGuard, roleGuard([UserRole.SuperAdmin])],
      },
      {
        path: 'operators',
        loadComponent: () =>
          import('./features/operators/operators.component').then(
            (m) => m.OperatorsComponent
          ),
        canActivate: [authGuard, roleGuard([UserRole.SuperAdmin])],
      },
      {
        path: 'operators/:id/profile',
        loadComponent: () =>
          import(
            './features/operators/components/operator-details-page/operator-details-page.component'
          ).then((m) => m.OperatorDetailsPageComponent),
        canActivate: [authGuard, roleGuard([UserRole.SuperAdmin])],
      },
      {
        path: 'communications',
        loadComponent: () =>
          import('./features/communications/communications.component').then(
            (m) => m.CommunicationsComponent
          ),
        canActivate: [authGuard, roleGuard([UserRole.SuperAdmin])],
      },
      {
        path: 'employee-chat',
        loadComponent: () =>
          import(
            './shared/components/employee-chat/employee-chat.component'
          ).then((m) => m.EmployeeChatComponent),
        canActivate: [authGuard, roleGuard([UserRole.SuperAdmin])],
      },
      {
        path: 'documents',
        loadComponent: () =>
          import('./features/documents/documents.component').then(
            (m) => m.DocumentsComponent
          ),
        canActivate: [authGuard, roleGuard([UserRole.SuperAdmin])],
      },
      {
        path: 'documents/:id',
        loadComponent: () =>
          import(
            './features/documents/components/kyc-details/kyc-details.component'
          ).then((m) => m.KycDetailsComponent),
        canActivate: [authGuard, roleGuard([UserRole.SuperAdmin])],
      },
      {
        path: 'kyc-verification',
        loadComponent: () =>
          import(
            './features/client-portal/client-kyc/client-kyc.component'
          ).then((m) => m.ClientKycComponent),
        canActivate: [
          authGuard,
          roleGuard([UserRole.SuperAdmin, UserRole.Client]),
        ],
      },
      {
        path: 'trading-accounts',
        loadComponent: () =>
          import(
            './features/client-portal/trading-accounts/trading-accounts.component'
          ).then((m) => m.TradingAccountsComponent),
        canActivate: [
          authGuard,
          roleGuard([UserRole.SuperAdmin, UserRole.Client]),
        ],
      },
      {
        path: 'brands',
        loadComponent: () =>
          import('./features/brands/brands.component').then(
            (m) => m.BrandsComponent
          ),
        canActivate: [authGuard, roleGuard([UserRole.SuperAdmin])],
      },
      {
        path: 'offices',
        loadComponent: () =>
          import('./features/officies/officies.component').then(
            (m) => m.OfficesComponent
          ),
        canActivate: [authGuard, roleGuard([UserRole.SuperAdmin])],
      },
      {
        path: 'offices/:id/rules',
        loadComponent: () =>
          import(
            './features/officies/components/office-rules/office-rules.component'
          ).then((m) => m.OfficeRulesComponent),
        canActivate: [authGuard, roleGuard([UserRole.SuperAdmin])],
      },
      {
        path: 'desks',
        loadComponent: () =>
          import('./features/desks/desks.component').then(
            (m) => m.DesksComponent
          ),
        canActivate: [authGuard, roleGuard([UserRole.SuperAdmin])],
      },
      // {
      //   path: 'departments',
      //   loadComponent: () =>
      //     import('./features/departments/departments.component').then(
      //       (m) => m.DepartmentsComponent
      //     ),
      //   canActivate: [authGuard, roleGuard([UserRole.SuperAdmin])],
      // },
      {
        path: 'teams',
        loadComponent: () =>
          import('./features/teams/teams.component').then(
            (m) => m.TeamsComponent
          ),
        canActivate: [authGuard, roleGuard([UserRole.SuperAdmin])],
      },
      {
        path: 'hierarchy',
        loadComponent: () =>
          import('./features/hierarchy/hierarchy.component').then(
            (m) => m.HierarchyComponent
          ),
        canActivate: [authGuard, roleGuard([UserRole.SuperAdmin])],
      },
      {
        path: 'sources',
        loadComponent: () =>
          import('./features/sources/sources.component').then(
            (m) => m.SourcesComponent
          ),
        canActivate: [authGuard, roleGuard([UserRole.SuperAdmin])],
      },
    ],
  },

  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: '**', redirectTo: '/dashboard' },
];
