export interface TwoFactorSetupResponse {
  secretKey: string;
  manualEntryKey: string;
  qrCodeUri: string;
}

export interface TwoFactorVerifyRequest {
  code: string;
}
