export interface Profile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  telephone?: string;
  secondTelephone?: string;
  country?: string;
  language?: string;
  dateOfBirth?: string | Date;
}

export interface UpdateProfileRequest {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  telephone?: string;
  secondTelephone?: string;
  country?: string;
  language?: string;
  dateOfBirth?: string | null;
}