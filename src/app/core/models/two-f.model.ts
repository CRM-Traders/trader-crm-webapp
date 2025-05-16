export interface TwoFactorSetupResponse {
  secretKey: string;
  manualEntryKey: string;
  qrCodeUri: string;
}

export interface TwoFactorStatusResponse {
  enabled: boolean;
}

export interface TwoFactorVerifyRequest {
  code: string;
}
