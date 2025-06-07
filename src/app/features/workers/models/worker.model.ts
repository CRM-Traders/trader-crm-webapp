export interface WorkerRegistrationDto {
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  role: number;
  phoneNumber: string;
  password?: string; // Optional - will be generated if not provided
}

export interface WorkerRegistrationResponse {
  success: boolean;
  message: string;
  userId?: string;
  generatedPassword?: string; // Present when password was auto-generated
}

export interface ImportResult {
  successCount: number;
  failureCount: number;
  userResults: Array<{
    email: string;
    username: string;
    success: boolean;
    error?: string;
    generatedPassword?: string;
  }>;
}

export enum UserRole {
  User = 1,
  Manager = 2,
  Admin = 3,
  SuperUser = 4,
  Worker = 8,
}
