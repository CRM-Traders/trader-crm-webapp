import { Routes } from '@angular/router';
import { publicGuard } from './core/guards/public.guard';
import { authGuard } from './core/guards/auth.guard';
import { EmployeeChatComponent } from './shared/components/employee-chat/employee-chat.component';

export const routes: Routes = [
  // Publics
  {
    path: 'auth/login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then(
        (m) => m.LoginComponent
      ),
    canActivate: [publicGuard],
  },

  // Auth
  {
    path: 'auth/unauthorized',
    loadComponent: () =>
      import('./features/auth/unauthorized/unauthorized.component').then(
        (m) => m.UnauthorizedComponent
      ),
    canActivate: [authGuard],
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
        canActivate: [authGuard],
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
        canActivate: [authGuard],
      },
      {
        path: 'clients',
        loadComponent: () =>
          import('./features/clients/clients.component').then(
            (m) => m.ClientsComponent
          ),
        canActivate: [authGuard],
      },
      {
        path: 'workers',
        loadComponent: () =>
          import('./features/workers/workers.component').then(
            (m) => m.WorkersComponent
          ),
        canActivate: [authGuard],
      },
      {
        path: 'tickets',
        loadComponent: () =>
          import('./features/tickets/tickets.component').then(
            (m) => m.TicketsComponent
          ),
        canActivate: [authGuard],
      },
      {
        path: 'api-docs',
        loadComponent: () =>
          import('./features/api-docs/api-docs.component').then(
            (m) => m.ApiDocsComponent
          ),
        canActivate: [authGuard],
      },
      {
        path: 'affiliates',
        loadComponent: () =>
          import('./features/affiliates/affiliates.component').then(
            (m) => m.AffiliatesComponent
          ),
        canActivate: [authGuard],
      },
      {
        path: 'leads',
        loadComponent: () =>
          import('./features/leads/leads.component').then(
            (m) => m.LeadsComponent
          ),
        canActivate: [authGuard],
      },
      {
        path: 'charts',
        loadComponent: () =>
          import('./features/charts/charts.component').then(
            (m) => m.ChartsComponent
          ),
        canActivate: [authGuard],
      },
      {
        path: 'communications',
        loadComponent: () =>
          import('./features/communications/communications.component').then(
            (m) => m.CommunicationsComponent
          ),
        canActivate: [authGuard],
      },
      {
        path: 'employee-chat',
        loadComponent: () =>
          import(
            './shared/components/employee-chat/employee-chat.component'
          ).then((m) => m.EmployeeChatComponent),
        canActivate: [authGuard],
      },
      {
        path: 'documents',
        loadComponent: () =>
          import('./features/documents/documents.component').then(
            (m) => m.DocumentsComponent
          ),
        canActivate: [authGuard],
      },
      {
        path: 'documents/:id',
        loadComponent: () =>
          import(
            './features/documents/components/kyc-details/kyc-details.component'
          ).then((m) => m.KycDetailsComponent),
        canActivate: [authGuard],
      },
      {
        path: 'kyc-verification',
        loadComponent: () =>
          import(
            './features/client-portal/client-kyc/client-kyc.component'
          ).then((m) => m.ClientKycComponent),
        canActivate: [authGuard],
      },
    ],
  },

  // Default
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: '**', redirectTo: '/dashboard' },
];
