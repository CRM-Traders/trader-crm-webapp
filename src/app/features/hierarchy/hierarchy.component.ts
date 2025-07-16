// src/app/features/hierarchy/hierarchy.component.ts

import { CommonModule } from '@angular/common';
import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal,
  computed,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import { AlertService } from '../../core/services/alert.service';
import { HierarchyNode, HierarchySearchResult } from './models/hierarchy.model';
import { HierarchyService } from './services/hierarchy.service';
import { HierarchyNodeComponent } from './components/hierarchy-node/hierarchy-node.component';

@Component({
  selector: 'app-hierarchy',
  standalone: true,
  imports: [CommonModule, FormsModule, HierarchyNodeComponent],
  template: `
    <div
      class="p-6 bg-white general-container dark:bg-gray-900 transition-colors"
    >
      <!-- Header -->
      <div class="mb-8">
        <div
          class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
        >
          <div>
            <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Organization Hierarchy
            </h1>
            <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Manage your organizational structure and team members
            </p>
          </div>
        </div>
      </div>

      <!-- Search and Stats -->

      <div class="mb-8">
        <!-- Statistics -->
        <div
          *ngIf="hierarchyStats()"
          class="grid grid-cols-1 md:grid-cols-4 gap-4"
        >
          <div class="text-center p-4 bg-[#8B5CF6]/60 rounded-lg">
            <div class="text-2xl font-bold text-white">
              {{ hierarchyStats()!.offices }}
            </div>
            <div class="text-sm text-white/90">Offices</div>
          </div>
          <div class="text-center p-4 bg-[#10B981]/60 rounded-lg">
            <div class="text-2xl font-bold text-white">
              {{ hierarchyStats()!.brands }}
            </div>
            <div class="text-sm text-white/90">Brands</div>
          </div>
          <div class="text-center p-4 bg-[#FF6B9D]/60 rounded-lg">
            <div class="text-2xl font-bold text-white">
              {{ hierarchyStats()!.desks }}
            </div>
            <div class="text-sm text-white/90">Desks</div>
          </div>
          <div class="text-center p-4 bg-[#F59E0B]/60 rounded-lg">
            <div class="text-2xl font-bold text-white">
              {{ hierarchyStats()!.members }}
            </div>
            <div class="text-sm text-white/90">Members</div>
          </div>
        </div>
      </div>

      <!-- Hierarchy Tree -->
      <div
        class="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700"
      >
        <!-- Search Bar -->
        <div
          class="mb-4 border-b border-gray-200 dark:border-gray-700 pb-4 flex items-center justify-between"
        >
          <div class="relative">
            <div
              class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"
            >
              <svg
                class="h-5 w-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                ></path>
              </svg>
            </div>
            <input
              type="text"
              [(ngModel)]="searchQuery"
              (input)="onSearchInput($event)"
              placeholder="Search by name, email, or country..."
              [class]="
                'block w-80 !pl-10 pr-3 py-3 border rounded-lg leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ' +
                (searchResults().length > 0
                  ? 'border-green-500 focus:border-green-500'
                  : 'border-gray-300 dark:border-gray-600')
              "
            />
            <div
              *ngIf="searchQuery"
              class="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              <button
                (click)="clearSearch()"
                class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg
                  class="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M6 18L18 6M6 6l12 12"
                  ></path>
                </svg>
              </button>
            </div>
          </div>
          <!-- Action Buttons -->
          <div class="flex items-center gap-3">
            <button
              (click)="expandAll()"
              class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              <svg
                class="w-4 h-4 mr-2 inline"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                ></path>
              </svg>
              Expand All
            </button>

            <button
              (click)="collapseAll()"
              class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              <svg
                class="w-4 h-4 mr-2 inline"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M20 12H4"
                ></path>
              </svg>
              Collapse All
            </button>

            <button
              (click)="refreshHierarchy()"
              [disabled]="loading()"
              class="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors flex items-center"
            >
              <svg
                class="w-4 h-4 mr-2"
                [class.animate-spin]="loading()"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                ></path>
              </svg>
              {{ loading() ? 'Loading...' : 'Refresh' }}
            </button>
          </div>
        </div>

        <!-- Search Results -->
        <div
          *ngIf="searchResults().length > 0"
          class="mb-4 border-b border-gray-200 dark:border-gray-600 pb-4"
        >
          <div class="text-sm text-gray-600 dark:text-gray-400 mb-3">
            Found {{ searchResults().length }} result(s)
            <span
              *ngIf="searchQueryTrimmed()"
              class="text-green-600 dark:text-green-400"
            >
              • Auto-expanded matching nodes
            </span>
          </div>
          <div class="space-y-2 max-h-40 overflow-y-auto">
            <div
              *ngFor="let result of searchResults()"
              (click)="navigateToNode(result)"
              class="p-3 border border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/10 transition-colors"
            >
              <div
                class="font-medium text-gray-900 dark:text-gray-100"
                [innerHTML]="getHighlightedText(result.node.name, searchQuery)"
              ></div>
              <div
                class="text-sm text-gray-500 dark:text-gray-400"
                [innerHTML]="
                  getHighlightedText(result.path.join(' > '), searchQuery)
                "
              ></div>
              <div class="text-xs text-blue-600 dark:text-blue-400 mt-1">
                Matches: {{ result.matches.join(', ') }}
              </div>
            </div>
          </div>
        </div>
        <div>
          <div
            *ngIf="loading() && !hierarchyNodes().length"
            class="text-center py-12"
          >
            <div class="inline-flex items-center">
              <svg
                class="animate-spin h-6 w-6 text-blue-600 mr-3"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                ></circle>
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <span class="text-gray-600 dark:text-gray-400"
                >Loading hierarchy...</span
              >
            </div>
          </div>

          <div
            *ngIf="!loading() && hierarchyNodes().length === 0"
            class="text-center py-12"
          >
            <svg
              class="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              ></path>
            </svg>
            <h3
              class="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100"
            >
              No hierarchy data
            </h3>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Get started by creating your first brand.
            </p>
          </div>

          <!-- Tree Nodes -->
          <div *ngIf="hierarchyNodes().length > 0" class="space-y-1">
            <ng-container *ngFor="let node of hierarchyNodes()">
              <div [attr.data-node-id]="node.id" class="node-container">
                <app-hierarchy-node
                  [node]="node"
                  [expandedNodes]="expandedNodes()"
                  [searchQuery]="searchQuery"
                  (nodeToggle)="onNodeToggle($event)"
                  (nodeSelect)="onNodeSelect($event)"
                >
                </app-hierarchy-node>
              </div>
            </ng-container>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class HierarchyComponent implements OnInit, OnDestroy {
  private hierarchyService = inject(HierarchyService);
  private alertService = inject(AlertService);
  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();

  // Signals
  hierarchyNodes = signal<HierarchyNode[]>([]);
  expandedNodes = signal<Set<string>>(new Set());
  loading = signal<boolean>(false);
  searchResults = signal<HierarchySearchResult[]>([]);

  // Properties
  searchQuery = '';

  // Computed values
  searchQueryTrimmed = computed(() => this.searchQuery.trim());

  hierarchyStats = computed(() => {
    const nodes = this.hierarchyNodes();
    if (!nodes.length) return null;

    let brands = 0;
    let offices = 0;
    let desks = 0;
    let teams = 0;
    let members = 0;

    function countNodes(nodeList: HierarchyNode[]) {
      for (const node of nodeList) {
        switch (node.type) {
          case 'brand':
            brands++;
            break;
          case 'office':
            offices++;
            break;
          case 'desk':
            desks++;
            break;
          case 'team':
            teams++;
            break;
          case 'member':
            members++;
            break;
        }
        if (node.children) {
          countNodes(node.children);
        }
      }
    }

    countNodes(nodes);
    return { brands, offices, desks, teams, members };
  });

  ngOnInit() {
    this.setupSearchDebounce();
    this.loadHierarchy();

    // Subscribe to expanded nodes
    this.hierarchyService.expandedNodes$
      .pipe(takeUntil(this.destroy$))
      .subscribe((expandedNodes) => {
        this.expandedNodes.set(expandedNodes);
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupSearchDebounce() {
    this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((query) => {
        this.performSearch(query);
      });
  }

  loadHierarchy() {
    this.loading.set(true);

    this.hierarchyService
      .loadHierarchy()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (nodes) => {
          this.hierarchyNodes.set(nodes);
          this.loading.set(false);
        },
        error: (error) => {
          this.alertService.error('Failed to load organization hierarchy');
          this.loading.set(false);
        },
      });
  }

  refreshHierarchy() {
    this.loadHierarchy();
  }

  onSearchInput(event: any) {
    const query = event.target.value;
    this.searchSubject.next(query);
  }

  private performSearch(query: string) {
    if (!query.trim()) {
      this.searchResults.set([]);
      return;
    }

    const { results, expandedNodeIds } =
      this.hierarchyService.searchAndExpandHierarchy(query);
    this.searchResults.set(results);
  }

  clearSearch() {
    this.searchQuery = '';
    this.searchResults.set([]);

    const currentNodes = this.hierarchyNodes();
    this.hierarchyNodes.set([...currentNodes]);
  }

  navigateToNode(result: HierarchySearchResult) {
    const pathIds = this.hierarchyService.getNodePathIds(result.node);
    pathIds.forEach((id: string) => this.hierarchyService.expandNode(id));

    setTimeout(() => {
      const element = document.querySelector(
        `[data-node-id="${result.node.id}"]`
      );
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.classList.add('highlight');
        setTimeout(() => element.classList.remove('highlight'), 2000);
      }
    }, 100);

    this.clearSearch();
  }

  getHighlightedText(text: string, query: string): string {
    if (!query.trim()) {
      return text;
    }

    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<span class="search-highlight">$1</span>');
  }

  expandAll() {
    this.hierarchyService.expandAll();
  }

  collapseAll() {
    this.hierarchyService.collapseAll();
  }

  onNodeToggle(nodeId: string) {
    this.hierarchyService.toggleNode(nodeId);
  }

  onNodeSelect(node: HierarchyNode) {}
}
