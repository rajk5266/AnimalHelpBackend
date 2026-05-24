// src/types/organization.ts

export type OrganizationType = "all" | "ngo" | "clinic" | "shelter" | "rescue_center";

export interface OrganizationListItem {
  id: string;
  name: string;
  slug: string;
  type: Exclude<OrganizationType, "all">; // Ensures runtime strings map strictly to database variations
  logo: string | null;
  phone: string | null;
  address: string | null;
  website: string | null;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  verified: boolean;
  verificationStatus: "pending" | "verified" | "rejected";
  verifiedAt: string | null;
  rejectedReason: string | null;
  createdAt: string;
  metadata: Record<string, any> | null;
  
  // Appended conditionally via backend Haversine math calculations
  distanceKm?: number;
}

export interface SearchFilters {
  query: string;
  type: OrganizationType;
  maxDistanceKm: number;
  userLat: number | null;
  userLng: number | null;
}