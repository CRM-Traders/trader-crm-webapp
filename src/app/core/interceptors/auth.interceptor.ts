// ./core/interceptors/auth.interceptor.ts
import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject, catchError, switchMap, filter, take, finalize } from 'rxjs';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<string | null>(null);

export const authInterceptor: HttpInterceptorFn = (
  request: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  if (shouldSkipAuth(request)) {
    return next(request);
  }

  const authToken = authService.getAccessToken();
  if (authToken) {
    request = addTokenToRequest(request, authToken);
  }

  return next(request).pipe(
    catchError(error => {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        return handle401Error(request, next, authService, router);
      }
      return throwError(() => error);
    })
  );
};

function addTokenToRequest(request: HttpRequest<any>, token: string): HttpRequest<any> {
  return request.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`
    }
  });
}


function handle401Error(
  request: HttpRequest<unknown>, 
  next: HttpHandlerFn,
  authService: AuthService,
  router: Router
): Observable<HttpEvent<unknown>> {
  if (!isRefreshing) {
    isRefreshing = true;
    refreshTokenSubject.next(null);

    return authService.refreshToken().pipe(
      switchMap((response) => {
        isRefreshing = false;
        refreshTokenSubject.next(response.accessToken);
        
        return next(addTokenToRequest(request, response.accessToken));
      }),
      catchError((error) => {
        isRefreshing = false;
        
        authService.logout();
        router.navigate(['/login'], { 
          queryParams: { 
            returnUrl: router.url,
            sessionExpired: 'true' 
          }
        });
        
        return throwError(() => error);
      }),
      finalize(() => {
        isRefreshing = false;
      })
    );
  } else {
    return refreshTokenSubject.pipe(
      filter(token => token !== null),
      take(1),
      switchMap(token => next(addTokenToRequest(request, token as string)))
    );
  }
}

function shouldSkipAuth(request: HttpRequest<unknown>): boolean {
  const apiUrl = environment.gatewayDomain;
  
  if (!request.url.includes(apiUrl)) {
    return true;
  }
  
  const authEndpoints = [
    'auth/login',
    'auth/refresh'
  ];
  
  return authEndpoints.some(endpoint => request.url.includes(endpoint));
}