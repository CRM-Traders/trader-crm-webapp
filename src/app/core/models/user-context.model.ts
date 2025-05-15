export interface UserContext {
  userAgent: string;
  browser: string;
  os: string;
  device: string;
  language: string;
  timezone: string;
  screenResolution: string;
  referrer: string;
  firstVisit: Date;
  lastVisit: Date;
}
