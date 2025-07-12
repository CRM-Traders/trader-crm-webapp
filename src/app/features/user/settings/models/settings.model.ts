export interface Settings {
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  phoneNumber: string | null;
  isEmailConfirmed: boolean;
  role: string;
  isTwoFactorEnabled: boolean;
}
