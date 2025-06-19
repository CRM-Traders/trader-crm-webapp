// src/app/core/models/hierarchy.model.ts

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

export interface HierarchyDepartment {
  id: string;
  name: string;
  isActive: boolean;
  teams: HierarchyTeam[];
  expanded?: boolean;
}

export interface HierarchyDesk {
  id: string;
  name: string;
  type: number;
  language: string | null;
  isActive: boolean;
  departments: HierarchyDepartment[];
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

export interface HierarchyResponse {
  brands: HierarchyBrand[];
}

export interface HierarchyNode {
  id: string;
  name: string;
  type: 'brand' | 'desk' | 'department' | 'team' | 'member';
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
