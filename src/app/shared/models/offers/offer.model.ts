export interface OfferRequest {
  title: string;
  listingPrice: number;
  listingOn: string; // ISO date string
  preSalePrice?: number | null;
  logoUrl: string;
}

export interface OfferResponse {
  id: string;
  title: string;
  listingPrice: number;
  listingOn: string; // ISO date string
  preSalePrice?: number | null;
  logoUrl: string;
}


