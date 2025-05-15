import { Injectable, inject, signal } from '@angular/core';
import { UserContext } from '../models/user-context.model';

@Injectable({
  providedIn: 'root',
})
export class UserContextService {
  private readonly _userContext = signal<UserContext>({
    userAgent: navigator.userAgent,
    browser: this.detectBrowser(),
    os: this.detectOS(),
    device: this.detectDevice(),
    language: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    referrer: document.referrer,
    firstVisit: new Date(),
    lastVisit: new Date(),
  });

  readonly userContext = this._userContext.asReadonly();

  constructor() {
    this.initUserContext();
  }

  private initUserContext(): void {
    const storedContext = localStorage.getItem('user_context');
    if (storedContext) {
      try {
        const parsed = JSON.parse(storedContext);
        parsed.lastVisit = new Date();
        this._userContext.set({ ...parsed, userAgent: navigator.userAgent });
      } catch (e) {}
    } else {
    }

    window.addEventListener('beforeunload', () => {
      localStorage.setItem(
        'user_context',
        JSON.stringify({
          ...this._userContext(),
          lastVisit: new Date(),
        })
      );
    });
  }

  private detectBrowser(): string {
    const ua = navigator.userAgent;
    if (ua.indexOf('Chrome') > -1) return 'Chrome';
    if (ua.indexOf('Firefox') > -1) return 'Firefox';
    if (ua.indexOf('Safari') > -1) return 'Safari';
    if (ua.indexOf('Edge') > -1) return 'Edge';
    if (ua.indexOf('MSIE') > -1 || ua.indexOf('Trident/') > -1)
      return 'Internet Explorer';
    return 'Unknown';
  }

  private detectOS(): string {
    const ua = navigator.userAgent;
    if (ua.indexOf('Windows') > -1) return 'Windows';
    if (ua.indexOf('Mac') > -1) return 'MacOS';
    if (ua.indexOf('Linux') > -1) return 'Linux';
    if (ua.indexOf('Android') > -1) return 'Android';
    if (
      ua.indexOf('iOS') > -1 ||
      ua.indexOf('iPhone') > -1 ||
      ua.indexOf('iPad') > -1
    )
      return 'iOS';
    return 'Unknown';
  }

  private detectDevice(): string {
    const ua = navigator.userAgent;
    if (ua.indexOf('Mobile') > -1) return 'Mobile';
    if (ua.indexOf('Tablet') > -1) return 'Tablet';
    return 'Desktop';
  }
}
