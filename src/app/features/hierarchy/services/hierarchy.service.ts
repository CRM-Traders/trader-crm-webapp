// src/app/core/services/hierarchy.service.ts

import { Injectable, inject } from '@angular/core';
import { Observable, BehaviorSubject, map } from 'rxjs';
import {
  HierarchyResponse,
  HierarchyBrand,
  HierarchyNode,
  HierarchySearchResult,
  UserRole,
} from '../models/hierarchy.model';
import { HttpService } from '../../../core/services/http.service';

@Injectable({
  providedIn: 'root',
})
export class HierarchyService {
  private http = inject(HttpService);

  private hierarchySubject = new BehaviorSubject<HierarchyNode[]>([]);
  private expandedNodesSubject = new BehaviorSubject<Set<string>>(new Set());

  hierarchy$ = this.hierarchySubject.asObservable();
  expandedNodes$ = this.expandedNodesSubject.asObservable();

  getHierarchy(): Observable<HierarchyResponse> {
    return this.http.get<HierarchyResponse>(
      'identity/api/organization/hierarchy'
    );
  }

  loadHierarchy(): Observable<HierarchyNode[]> {
    return this.getHierarchy().pipe(
      map((response) => {
        const nodes = this.transformToNodes(response.brands);
        this.hierarchySubject.next(nodes);
        return nodes;
      })
    );
  }

  private transformToNodes(brands: HierarchyBrand[]): HierarchyNode[] {
    return brands.map((brand) => this.brandToNode(brand, 0));
  }

  private brandToNode(brand: HierarchyBrand, level: number): HierarchyNode {
    const children = brand.desks.map((desk) =>
      this.deskToNode(desk, level + 1)
    );

    return {
      id: brand.id,
      name: brand.name,
      type: 'brand',
      isActive: brand.isActive,
      expanded: brand.expanded || false,
      level,
      hasChildren: children.length > 0,
      children,
      data: { country: brand.country },
    };
  }

  private deskToNode(desk: any, level: number): HierarchyNode {
    const children = desk.departments.map((dept: any) =>
      this.departmentToNode(dept, level + 1)
    );

    return {
      id: desk.id,
      name: desk.name,
      type: 'desk',
      isActive: desk.isActive,
      expanded: desk.expanded || false,
      level,
      hasChildren: children.length > 0,
      children,
      data: { type: desk.type, language: desk.language },
    };
  }

  private departmentToNode(department: any, level: number): HierarchyNode {
    const children = department.teams.map((team: any) =>
      this.teamToNode(team, level + 1)
    );

    return {
      id: department.id,
      name: department.name,
      type: 'department',
      isActive: department.isActive,
      expanded: department.expanded || false,
      level,
      hasChildren: children.length > 0,
      children,
    };
  }

  private teamToNode(team: any, level: number): HierarchyNode {
    const children = team.members.map((member: any) =>
      this.memberToNode(member, level + 1)
    );

    return {
      id: team.id,
      name: team.name,
      type: 'team',
      isActive: team.isActive,
      expanded: team.expanded || false,
      level,
      hasChildren: children.length > 0,
      children,
    };
  }

  private memberToNode(member: any, level: number): HierarchyNode {
    return {
      id: member.userId,
      name: member.fullName,
      type: 'member',
      isActive: true,
      expanded: false,
      level,
      hasChildren: false,
      data: {
        email: member.email,
        role: member.role,
        assignedDate: member.assignedDate,
      },
    };
  }

  toggleNode(nodeId: string): void {
    const expandedNodes = new Set(this.expandedNodesSubject.value);

    if (expandedNodes.has(nodeId)) {
      expandedNodes.delete(nodeId);
    } else {
      expandedNodes.add(nodeId);
    }

    this.expandedNodesSubject.next(expandedNodes);
  }

  expandNode(nodeId: string): void {
    const expandedNodes = new Set(this.expandedNodesSubject.value);
    expandedNodes.add(nodeId);
    this.expandedNodesSubject.next(expandedNodes);
  }

  collapseNode(nodeId: string): void {
    const expandedNodes = new Set(this.expandedNodesSubject.value);
    expandedNodes.delete(nodeId);
    this.expandedNodesSubject.next(expandedNodes);
  }

  expandAll(): void {
    const nodes = this.hierarchySubject.value;
    const allNodeIds = this.getAllNodeIds(nodes);
    this.expandedNodesSubject.next(new Set(allNodeIds));
  }

  collapseAll(): void {
    this.expandedNodesSubject.next(new Set());
  }

  private getAllNodeIds(nodes: HierarchyNode[]): string[] {
    const ids: string[] = [];

    function traverse(nodeList: HierarchyNode[]) {
      for (const node of nodeList) {
        if (node.hasChildren) {
          ids.push(node.id);
          if (node.children) {
            traverse(node.children);
          }
        }
      }
    }

    traverse(nodes);
    return ids;
  }

  searchHierarchy(query: string): HierarchySearchResult[] {
    if (!query.trim()) return [];

    const results: HierarchySearchResult[] = [];
    const nodes = this.hierarchySubject.value;

    function search(nodeList: HierarchyNode[], path: string[] = []) {
      for (const node of nodeList) {
        const currentPath = [...path, node.name];
        const matches: string[] = [];

        // Check node name
        if (node.name.toLowerCase().includes(query.toLowerCase())) {
          matches.push('name');
        }

        // Check additional data based on type
        if (node.type === 'member' && node.data) {
          if (node.data.email?.toLowerCase().includes(query.toLowerCase())) {
            matches.push('email');
          }
        }

        if (node.type === 'brand' && node.data) {
          if (node.data.country?.toLowerCase().includes(query.toLowerCase())) {
            matches.push('country');
          }
        }

        if (matches.length > 0) {
          results.push({ node, path: currentPath, matches });
        }

        if (node.children) {
          search(node.children, currentPath);
        }
      }
    }

    search(nodes);
    return results;
  }

  getRoleDisplayName(role: number): string {
    const roleNames: Record<number, string> = {
      [UserRole.SuperAdmin]: 'Super Admin',
      [UserRole.Admin]: 'Admin',
      [UserRole.Manager]: 'Manager',
      [UserRole.Agent]: 'Agent',
      [UserRole.User]: 'User',
    };

    return roleNames[role] || 'Unknown';
  }

  getNodeIcon(type: string): string {
    const icons: Record<string, string> = {
      brand: 'building-office',
      desk: 'computer-desktop',
      department: 'user-group',
      team: 'users',
      member: 'user',
    };

    return icons[type] || 'folder';
  }

  getNodeStats(node: HierarchyNode): {
    total: number;
    active: number;
    inactive: number;
  } {
    let total = 0;
    let active = 0;
    let inactive = 0;

    function countNodes(nodeList: HierarchyNode[]) {
      for (const n of nodeList) {
        if (n.type === 'member') {
          total++;
          if (n.isActive) active++;
          else inactive++;
        }
        if (n.children) {
          countNodes(n.children);
        }
      }
    }

    if (node.children) {
      countNodes(node.children);
    }

    return { total, active, inactive };
  }
}
