export interface TwoFactorSetupResponse {
  secretKey: string;
  manualEntryKey: string;
  qrCodeSetupUri: string;
}

export interface TwoFactorStatusResponse {
  enabled: boolean;
}

export interface TwoFactorVerifyRequest {
  code: string;
}
