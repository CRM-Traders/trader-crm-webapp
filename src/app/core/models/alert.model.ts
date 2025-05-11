export enum AlertType {
  SUCCESS = 'success',
  ERROR = 'error',
  INFO = 'info',
  WARNING = 'warning',
}

export interface Alert {
  id: string;
  type: AlertType;
  message: string;
  autoClose?: boolean;
  keepAfterRouteChange?: boolean;
  timeout?: number;
}
