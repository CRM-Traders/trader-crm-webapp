export interface Callback {
  id: string;
  callbackDateTime: string;
  clientId: string;
  clientFirstName: string;
  clientLastName: string;
  clientEmail: string;
  reminderInMinutes: number;
  isOpenedReminder: boolean;
  isOverdue: boolean;
  isDue: boolean;
  createdAt: string;
}

export interface CallbackCreateRequest {
  callbackDateTime: string;
  clientId: string;
  clientFirstName: string;
  clientLastName: string;
  clientEmail: string;
  reminderInMinutes: number;
}

export interface CallbackUpdateRequest {
  id: string;
  callbackDateTime: string;
  reminderInMinutes: number;
}

export interface CallbackCreateResponse {
  id: string;
  callbackDateTime: string;
  clientId: string;
  createdAt: string;
}
