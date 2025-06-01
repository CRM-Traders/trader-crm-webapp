export interface AffiliateSecret {
  id: string;
  affiliateId: string;
  affiliateName?: string;
  affiliateEmail?: string;
  secretKey: string;
  expirationDate: string;
  ipRestriction?: string;
  isActive: boolean;
  usedCount: number;
  isExpired: boolean;
  createdAt: string;
  lastModifiedAt?: string;
}

export interface CreateAffiliateSecretRequest {
  expirationDate?: string;
  ipRestriction?: string;
}

export interface UpdateAffiliateSecretRequest {
  expirationDate: string;
  ipRestriction?: string;
}
