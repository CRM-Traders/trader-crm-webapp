export interface WorkerRegistrationDto {
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  password: string;
  phoneNumber: string;
}

export interface ImportResult {
  successCount: number;
  failureCount: number;
  userResults: Array<{
    email: string;
    username: string;
    // Add other fields as needed
  }>;
}
