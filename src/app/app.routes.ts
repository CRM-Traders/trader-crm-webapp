import { Routes } from '@angular/router';
import { publicGuard } from './core/guards/public.guard';
import { authGuard, roleGuard } from './core/guards/auth.guard';
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
        canActivate: [authGuard, roleGuard(151)],
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
        canActivate: [authGuard, roleGuard(161)],
      },
      {
        path: 'clients',
        loadComponent: () =>
          import('./features/clients/clients.component').then(
            (m) => m.ClientsComponent
          ),
        canActivate: [authGuard, roleGuard(158)],
      },
      {
        path: 'clients/:id',
        loadComponent: () =>
          import('./features/client-details/client-details.component').then(
            (m) => m.ClientDetailsComponent
          ),
        canActivate: [authGuard, roleGuard(158)],
      },
      {
        path: 'affiliates',
        loadComponent: () =>
          import('./features/affiliates/affiliates.component').then(
            (m) => m.AffiliatesComponent
          ),
        canActivate: [authGuard, roleGuard(188)],
      },
      {
        path: 'leads',
        loadComponent: () =>
          import('./features/leads/leads.component').then(
            (m) => m.LeadsComponent
          ),
        canActivate: [authGuard, roleGuard(159)],
      },
      {
        path: 'operators',
        loadComponent: () =>
          import('./features/operators/operators.component').then(
            (m) => m.OperatorsComponent
          ),
        canActivate: [authGuard, roleGuard(160)],
      },
      {
        path: 'operators/:id/profile',
        loadComponent: () =>
          import(
            './features/operators/components/operator-details-page/operator-details-page.component'
          ).then((m) => m.OperatorDetailsPageComponent),
        canActivate: [authGuard, roleGuard(160)],
      },
      {
        path: 'operators/:id/permissions',
        loadComponent: () =>
          import('./features/permissions/permissions.component').then(
            (m) => m.PermissionsComponent
          ),
        canActivate: [authGuard], //roleGuard(160)],
      },
      {
        path: 'documents',
        loadComponent: () =>
          import('./features/documents/documents.component').then(
            (m) => m.DocumentsComponent
          ),
        canActivate: [authGuard, roleGuard(163)],
      },
      {
        path: 'documents/:id',
        loadComponent: () =>
          import(
            './features/documents/components/kyc-details/kyc-details.component'
          ).then((m) => m.KycDetailsComponent),
        canActivate: [authGuard, roleGuard(163)],
      },
      {
        path: 'brands',
        loadComponent: () =>
          import('./features/brands/brands.component').then(
            (m) => m.BrandsComponent
          ),
        canActivate: [authGuard, roleGuard(154)],
      },
      {
        path: 'offices',
        loadComponent: () =>
          import('./features/officies/officies.component').then(
            (m) => m.OfficesComponent
          ),
        canActivate: [authGuard, roleGuard(153)],
      },
      {
        path: 'offices/:id/rules',
        loadComponent: () =>
          import(
            './features/officies/components/office-rules/office-rules.component'
          ).then((m) => m.OfficeRulesComponent),
        canActivate: [authGuard, roleGuard(153)],
      },
      {
        path: 'desks',
        loadComponent: () =>
          import('./features/desks/desks.component').then(
            (m) => m.DesksComponent
          ),
        canActivate: [authGuard, roleGuard(155)],
      },
      {
        path: 'salerules',
        loadComponent: () =>
          import('./features/sales-rules/sales-rules.component').then(
            (m) => m.SalesRulesComponent
          ),
        canActivate: [authGuard, roleGuard(157)],
      },
      {
        path: 'teams',
        loadComponent: () =>
          import('./features/teams/teams.component').then(
            (m) => m.TeamsComponent
          ),
        canActivate: [authGuard, roleGuard(156)],
      },
      {
        path: 'hierarchy',
        loadComponent: () =>
          import('./features/hierarchy/hierarchy.component').then(
            (m) => m.HierarchyComponent
          ),
        canActivate: [authGuard, roleGuard(152)],
      },
      {
        path: 'sources',
        loadComponent: () =>
          import('./features/sources/sources.component').then(
            (m) => m.SourcesComponent
          ),
        canActivate: [authGuard, roleGuard(162)],
      },
    ],
  },

  { path: '', redirectTo: '/', pathMatch: 'full' },
  { path: '**', redirectTo: '/' },
];
