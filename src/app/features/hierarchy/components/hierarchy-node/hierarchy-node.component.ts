// src/app/features/hierarchy/components/hierarchy-node/hierarchy-node.component.ts

import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { HierarchyNode } from '../../models/hierarchy.model';
import { HierarchyService } from '../../services/hierarchy.service';

@Component({
  selector: 'app-hierarchy-node',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './hierarchy-node.component.html',
  styleUrls: ['./hierarchy-node.component.scss'],
})
export class HierarchyNodeComponent {
  @Input() node!: HierarchyNode;
  @Input() expandedNodes: Set<string> = new Set();
  @Input() searchQuery: string = '';
  @Input() selectedNodeId?: string;

  @Output() nodeToggle = new EventEmitter<string>();
  @Output() nodeSelect = new EventEmitter<HierarchyNode>();

  private hierarchyService = inject(HierarchyService);

  get isExpanded(): boolean {
    return this.expandedNodes.has(this.node.id);
  }

  get isSelected(): boolean {
    return this.selectedNodeId === this.node.id;
  }

  onToggleClick(event: Event) {
    event.stopPropagation();
    this.nodeToggle.emit(this.node.id);
  }

  onNodeClick() {
    this.nodeSelect.emit(this.node);
  }

  getNodeClasses(): string {
    const baseClasses = 'flex items-center py-2 px-3 rounded-lg cursor-pointer transition-all duration-200 group relative';
    const selectedClass = this.isSelected ? ' bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500' : '';
    const inactiveClass = !this.node.isActive ? ' opacity-60' : '';
    const searchMatchClass = this.isSearchMatch ? ' search-match' : '';
    
    return baseClasses + selectedClass + inactiveClass + searchMatchClass;
  }

  get isSearchMatch(): boolean {
    if (!this.searchQuery.trim()) return false;
    
    const query = this.searchQuery.toLowerCase();
    
    // Check if node name matches
    if (this.node.name.toLowerCase().includes(query)) {
      return true;
    }
    
    // Check additional data based on type
    if (this.node.type === 'member' && this.node.data?.email) {
      if (this.node.data.email.toLowerCase().includes(query)) {
        return true;
      }
    }
    
    if ((this.node.type === 'brand' || this.node.type === 'office') && this.node.data?.country) {
      if (this.node.data.country.toLowerCase().includes(query)) {
        return true;
      }
    }
    
    return false;
  }

  getHighlightedName(): string {
    if (!this.searchQuery.trim() || !this.isSearchMatch) {
      return this.node.name;
    }
    
    const query = this.searchQuery.toLowerCase();
    const name = this.node.name;
    const index = name.toLowerCase().indexOf(query);
    
    if (index === -1) {
      return name;
    }
    
    const before = name.substring(0, index);
    const match = name.substring(index, index + query.length);
    const after = name.substring(index + query.length);
    
    return `${before}<span class="search-highlight">${match}</span>${after}`;
  }

  getIconClasses(): string {
    const typeColors = {
      brand: 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30',
      office:
        'text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/30',
      desk: 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30',
      team: 'text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30',
      member:
        'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-900/30',
    };

    const colorClass =
      typeColors[this.node.type as keyof typeof typeColors] ||
      typeColors.member;
    return `p-2 rounded-lg mr-3 flex-shrink-0 ${colorClass}`;
  }

  getNameClasses(): string {
    const baseClasses = 'font-medium truncate';
    const typeClasses = {
      brand: 'text-gray-900 dark:text-gray-100 text-base',
      office: 'text-gray-800 dark:text-gray-200 text-sm',
      desk: 'text-gray-700 dark:text-gray-300 text-sm',
      team: 'text-gray-600 dark:text-gray-400 text-sm',
      member: 'text-gray-500 dark:text-gray-500 text-sm',
    };

    const typeClass =
      typeClasses[this.node.type as keyof typeof typeClasses] ||
      typeClasses.member;
    return `${baseClasses} ${typeClass}`;
  }

  getStatusBadgeClasses(): string {
    const baseClasses = 'ml-2 px-2 py-1 text-xs font-medium rounded-full';
    const statusClasses = this.node.isActive
      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';

    return `${baseClasses} ${statusClasses}`;
  }

  getSecondaryInfo(): string {
    switch (this.node.type) {
      case 'office':
        return  'Office';
      case 'brand':
        return this.node.data?.country || '';
      case 'desk':
        return this.node.data?.language
          ? `Language: ${this.node.data.language}`
          : '';
      case 'member':
        return this.node.data?.email || '';
      default:
        return '';
    }
  }

  getChildrenCount(): string {
    if (!this.node.children) return '0';

    const count = this.node.children.length;
    const typeMap = {
      office: count === 1 ? 'brand' : 'brands',
      brand: count === 1 ? 'desk' : 'desks',
      desk: count === 1 ? 'team' : 'teams',
      team: count === 1 ? 'operator' : 'operators',
    };

    const type = typeMap[this.node.type as keyof typeof typeMap] || 'items';
    return `${count} ${type}`;
  }

  getRoleDisplayName(role: number): string {
    return this.hierarchyService.getRoleDisplayName(role);
  }
}
