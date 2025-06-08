import { Routes } from '@angular/router';
import { publicGuard } from './core/guards/public.guard';
import { authGuard, roleGuard } from './core/guards/auth.guard';
import { EmployeeChatComponent } from './shared/components/employee-chat/employee-chat.component';
import { UserRole } from './core/models/roles.model';

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
        canActivate: [
          authGuard,
          roleGuard([
            UserRole.SUPERUSER,
            UserRole.ADMIN,
            UserRole.MANAGER,
            UserRole.USER,
            UserRole.WORKER,
          ]),
        ],
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
        canActivate: [
          authGuard,
          roleGuard([
            UserRole.SUPERUSER,
            UserRole.ADMIN,
            UserRole.MANAGER,
            UserRole.USER,
            UserRole.WORKER,
          ]),
        ],
      },
      {
        path: 'clients',
        loadComponent: () =>
          import('./features/clients/clients.component').then(
            (m) => m.ClientsComponent
          ),
        canActivate: [
          authGuard,
          roleGuard([
            UserRole.SUPERUSER,
            UserRole.ADMIN,
            UserRole.MANAGER,
            UserRole.USER,
            UserRole.WORKER,
          ]),
        ],
      },
      {
        path: 'workers',
        loadComponent: () =>
          import('./features/workers/workers.component').then(
            (m) => m.WorkersComponent
          ),
        canActivate: [
          authGuard,
          roleGuard([
            UserRole.SUPERUSER,
            UserRole.ADMIN,
            UserRole.MANAGER,
            UserRole.USER,
            UserRole.WORKER,
          ]),
        ],
      },
      {
        path: 'tickets',
        loadComponent: () =>
          import('./features/tickets/tickets.component').then(
            (m) => m.TicketsComponent
          ),
        canActivate: [
          authGuard,
          roleGuard([
            UserRole.SUPERUSER,
            UserRole.ADMIN,
            UserRole.MANAGER,
            UserRole.USER,
            UserRole.WORKER,
          ]),
        ],
      },
      {
        path: 'api-docs',
        loadComponent: () =>
          import(
            './features/affiliate-portal/api-docs/api-docs.component'
          ).then((m) => m.ApiDocsComponent),
        canActivate: [
          authGuard,
          roleGuard([UserRole.SUPERUSER, UserRole.AFFILIATE]),
        ],
      },
      {
        path: 'affiliate-clients',
        loadComponent: () =>
          import(
            './features/affiliate-portal/clients/affiliate-clients/affiliate-clients.component'
          ).then((m) => m.AffiliateClientsComponent),
        canActivate: [authGuard, roleGuard([UserRole.AFFILIATE])],
      },
      {
        path: 'affiliates',
        loadComponent: () =>
          import('./features/affiliates/affiliates.component').then(
            (m) => m.AffiliatesComponent
          ),
        canActivate: [
          authGuard,
          roleGuard([
            UserRole.SUPERUSER,
            UserRole.ADMIN,
            UserRole.MANAGER,
            UserRole.USER,
            UserRole.WORKER,
          ]),
        ],
      },
      {
        path: 'leads',
        loadComponent: () =>
          import('./features/leads/leads.component').then(
            (m) => m.LeadsComponent
          ),
        canActivate: [
          authGuard,
          roleGuard([
            UserRole.SUPERUSER,
            UserRole.ADMIN,
            UserRole.MANAGER,
            UserRole.USER,
            UserRole.WORKER,
          ]),
        ],
      },
      {
        path: 'communications',
        loadComponent: () =>
          import('./features/communications/communications.component').then(
            (m) => m.CommunicationsComponent
          ),
        canActivate: [
          authGuard,
          roleGuard([
            UserRole.SUPERUSER,
            UserRole.ADMIN,
            UserRole.MANAGER,
            UserRole.USER,
            UserRole.WORKER,
          ]),
        ],
      },
      {
        path: 'employee-chat',
        loadComponent: () =>
          import(
            './shared/components/employee-chat/employee-chat.component'
          ).then((m) => m.EmployeeChatComponent),
        canActivate: [
          authGuard,
          roleGuard([
            UserRole.SUPERUSER,
            UserRole.ADMIN,
            UserRole.MANAGER,
            UserRole.USER,
            UserRole.WORKER,
          ]),
        ],
      },
      {
        path: 'documents',
        loadComponent: () =>
          import('./features/documents/documents.component').then(
            (m) => m.DocumentsComponent
          ),
        canActivate: [
          authGuard,
          roleGuard([
            UserRole.SUPERUSER,
            UserRole.ADMIN,
            UserRole.MANAGER,
            UserRole.USER,
            UserRole.WORKER,
          ]),
        ],
      },
      {
        path: 'documents/:id',
        loadComponent: () =>
          import(
            './features/documents/components/kyc-details/kyc-details.component'
          ).then((m) => m.KycDetailsComponent),
        canActivate: [
          authGuard,
          roleGuard([
            UserRole.SUPERUSER,
            UserRole.ADMIN,
            UserRole.MANAGER,
            UserRole.USER,
            UserRole.WORKER,
          ]),
        ],
      },
      {
        path: 'kyc-verification',
        loadComponent: () =>
          import(
            './features/client-portal/client-kyc/client-kyc.component'
          ).then((m) => m.ClientKycComponent),
        canActivate: [authGuard, roleGuard([UserRole.CLIENT])],
      },
      {
        path: 'traiding-accounts',
        loadComponent: () =>
          import(
            './features/client-portal/trading-accounts/trading-accounts.component'
          ).then((m) => m.TradingAccountsComponent),
        canActivate: [authGuard, roleGuard([UserRole.CLIENT])],
      },
    ],
  },

  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: '**', redirectTo: '/dashboard' },
];
