import {
  HttpInterceptorFn,
  HttpRequest,
  HttpHandlerFn,
  HttpEvent,
  HttpErrorResponse,
} from '@angular/common/http';
import {
  Observable,
  throwError,
  BehaviorSubject,
  catchError,
  switchMap,
  filter,
  take,
  finalize,
  from,
} from 'rxjs';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { UserContextService } from '../services/user-context.service';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<string | null>(null);

export const authInterceptor: HttpInterceptorFn = (
  request: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
  const authService = inject(AuthService);
  const userContextService = inject(UserContextService);
  const router = inject(Router);

  if (shouldSkipAuth(request)) {
    return next(request);
  }

  const userContext = userContextService.userContext();

  const authToken = authService.getAccessToken();
  if (authToken) {
    request = addTokenAndContextToRequest(request, authToken, userContext);
  }

  return next(request).pipe(
    catchError((error) => {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        return handle401Error(request, next, authService, router, userContext);
      }
      return throwError(() => error);
    })
  );
};

function addTokenAndContextToRequest(
  request: HttpRequest<any>,
  token: string,
  userContext: any
): HttpRequest<any> {
  return request.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`,
      'X-Client-Device': userContext.device || 'unknown',
      'X-Client-OS': userContext.os || 'unknown',
      'X-Client-Browser': userContext.browser || 'unknown',
    },
  });
}

function handle401Error(
  request: HttpRequest<unknown>,
  next: HttpHandlerFn,
  authService: AuthService,
  router: Router,
  userContext: any
): Observable<HttpEvent<unknown>> {
  if (!isRefreshing) {
    isRefreshing = true;
    refreshTokenSubject.next(null);

    return from(authService.refreshToken()).pipe(
      switchMap((response) => {
        isRefreshing = false;
        refreshTokenSubject.next(response.accessToken);

        return next(
          addTokenAndContextToRequest(
            request,
            response.accessToken,
            userContext
          )
        );
      }),
      catchError((error) => {
        isRefreshing = false;

        authService.logout();
        router.navigate(['/auth/login'], {
          queryParams: {
            returnUrl: router.url,
            sessionExpired: 'true',
          },
        });

        return throwError(() => error);
      }),
      finalize(() => {
        isRefreshing = false;
      })
    );
  } else {
    return refreshTokenSubject.pipe(
      filter((token) => token !== null),
      take(1),
      switchMap((token) =>
        next(addTokenAndContextToRequest(request, token as string, userContext))
      )
    );
  }
}

function shouldSkipAuth(request: HttpRequest<unknown>): boolean {
  const apiUrl = environment.gatewayDomain;

  if (!request.url.includes(apiUrl)) {
    return true;
  }

  const authEndpoints = ['auth/login', 'auth/refresh'];

  return authEndpoints.some((endpoint) => request.url.includes(endpoint));
}
