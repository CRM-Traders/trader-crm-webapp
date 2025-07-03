// src/app/features/hierarchy/models/hierarchy.model.ts

export interface HierarchyMember {
  userId: string;
  fullName: string;
  email: string;
  role: number;
  assignedDate: string;
}

export interface HierarchyTeam {
  id: string;
  name: string;
  isActive: boolean;
  members: HierarchyMember[];
  expanded?: boolean;
}

export interface HierarchyResponse {
  offices: HierarchyOffice[];
}

export interface HierarchyOffice {
  id: string;
  name: string;
  country: string;
  isActive: boolean;
  brands: HierarchyBrand[];
  expanded?: boolean;
}

export interface HierarchyBrand {
  id: string;
  name: string;
  country: string;
  isActive: boolean;
  desks: HierarchyDesk[];
  expanded?: boolean;
}

export interface HierarchyDesk {
  id: string;
  name: string;
  type: number;
  language: string | null;
  isActive: boolean;
  teams: HierarchyTeam[];
  expanded?: boolean;
}

export interface HierarchyNode {
  id: string;
  name: string;
  type:  'office' | 'brand' | 'desk' | 'team' | 'member';
  isActive: boolean;
  expanded?: boolean;
  level: number;
  hasChildren: boolean;
  children?: HierarchyNode[];
  data?: any;
  parent?: HierarchyNode;
}

export enum UserRole {
  SuperAdmin = 1,
  Admin = 2,
  Manager = 3,
  Agent = 4,
  User = 5,
}

export interface HierarchySearchResult {
  node: HierarchyNode;
  path: string[];
  matches: string[];
}
