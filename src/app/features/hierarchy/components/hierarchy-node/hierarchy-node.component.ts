// src/app/features/hierarchy/components/hierarchy-node/hierarchy-node.component.ts

import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { HierarchyNode } from '../../models/hierarchy.model';
import { HierarchyService } from '../../services/hierarchy.service';

@Component({
  selector: 'app-hierarchy-node',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="hierarchy-node">
      <!-- Node Header -->
      <div
        [class]="getNodeClasses()"
        (click)="onNodeClick()"
        [style.padding-left.rem]="node.level * 1.5"
        class="flex items-center py-2 px-3 rounded-lg cursor-pointer transition-all duration-200 group relative"
      >
        <!-- Expand/Collapse Button -->
        <button
          *ngIf="node.hasChildren"
          (click)="onToggleClick($event)"
          class="!mr-2 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600/20 transition-colors"
        >
          <svg
            class="w-4 h-4 transition-transform duration-200"
            [class.rotate-90]="isExpanded"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 5l7 7-7 7"
            ></path>
          </svg>
        </button>

        <!-- Spacer for nodes without children -->
        <div *ngIf="!node.hasChildren" class="w-6 mr-2"></div>

        <!-- Node Icon -->
        <div [class]="getIconClasses()">
          <svg
            class="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <!-- Brand Icon -->
            <path
              *ngIf="node.type === 'brand'"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
            ></path>
            <!-- Office Icon -->
            <path
              *ngIf="node.type === 'office'"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M3 21h18M3 10h18M12 2l7 4v14a1 1 0 01-1 1H6a1 1 0 01-1-1V6l7-4zM12 6v4m0 4v4"
            ></path>
            <!-- Desk Icon -->
            <path
              *ngIf="node.type === 'desk'"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            ></path>
            <!-- Team Icon -->
            <path
              *ngIf="node.type === 'team'"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
            ></path>
            <!-- Member Icon -->
            <path
              *ngIf="node.type === 'member'"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            ></path>
          </svg>
        </div>

        <!-- Node Content -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between">
            <div class="flex items-center min-w-0">
              <!-- Node Name -->
              <span [class]="getNameClasses()">
                {{ node.name }}
              </span>

              <!-- Status Badge -->
              <span
                *ngIf="node.type !== 'member'"
                [class]="getStatusBadgeClasses()"
              >
                {{ node.isActive ? 'Active' : 'Inactive' }}
              </span>

              <!-- Role Badge for Members -->
              <span
                *ngIf="node.type === 'member' && node.data?.role"
                class="ml-2 px-2 py-1 text-xs font-medium bg-blue-100/10 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200 rounded-full"
              >
                {{ getRoleDisplayName(node.data.role) }}
              </span>
            </div>

            <!-- Node Count Badge -->
            <div
              *ngIf="node.hasChildren"
              class="ml-2 flex items-center space-x-2"
            >
              <span
                class="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700/10 px-2 py-1 rounded-full"
              >
                {{ getChildrenCount() }}
              </span>
            </div>
          </div>

          <!-- Secondary Info -->
          <div
            *ngIf="getSecondaryInfo()"
            class="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate"
          >
            {{ getSecondaryInfo() }}
          </div>
        </div>

        <!-- Node Actions -->
        <div class="ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            class="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded transition-colors"
            title="More options"
          >
            <svg
              class="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
              ></path>
            </svg>
          </button>
        </div>
      </div>

      <!-- Children -->
      <div
        *ngIf="node.hasChildren && isExpanded"
        class="children-container transition-all duration-300 ease-in-out"
      >
        <ng-container *ngFor="let child of node.children">
          <app-hierarchy-node
            [node]="child"
            [expandedNodes]="expandedNodes"
            [searchQuery]="searchQuery"
            (nodeToggle)="nodeToggle.emit($event)"
            (nodeSelect)="nodeSelect.emit($event)"
          ></app-hierarchy-node>
        </ng-container>
      </div>
    </div>
  `,
  styles: [
    `
      .hierarchy-node {
        @apply transition-all duration-200;
      }

      .hierarchy-node.highlight {
        @apply bg-yellow-100 dark:bg-yellow-900/30 border-l-4 border-yellow-400;
        animation: highlight-pulse 2s ease-in-out;
      }

      @keyframes highlight-pulse {
        0%,
        100% {
          opacity: 1;
        }
        50% {
          opacity: 0.7;
        }
      }

      .children-container {
        @apply border-l border-gray-200 dark:border-gray-700 ml-3;
      }

      .node-selected {
        @apply bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500;
      }
    `,
  ],
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
    const baseClasses =
      'flex items-center py-2 px-3 rounded-lg cursor-pointer transition-all duration-200 group relative';
    const hoverClasses = 'hover:bg-gray-500/10 dark:hover:bg-gray-750/20';
    const selectedClasses = this.isSelected
      ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500'
      : '';
    const inactiveClasses = !this.node.isActive ? 'opacity-60' : '';

    return `${baseClasses} ${hoverClasses} ${selectedClasses} ${inactiveClasses}`.trim();
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
      case 'brand':
      case 'office':
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
      brand: count === 1 ? 'office' : 'offices',
      office: count === 1 ? 'desk' : 'desks',
      desk: count === 1 ? 'team' : 'teams',
      team: count === 1 ? 'member' : 'members',
    };

    const type = typeMap[this.node.type as keyof typeof typeMap] || 'items';
    return `${count} ${type}`;
  }

  getRoleDisplayName(role: number): string {
    return this.hierarchyService.getRoleDisplayName(role);
  }
}
