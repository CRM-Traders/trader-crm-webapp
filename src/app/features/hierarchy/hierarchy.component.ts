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
import { HasPermissionDirective } from '../../core/directives/has-permission.directive';

@Component({
  selector: 'app-hierarchy',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HierarchyNodeComponent,
    HasPermissionDirective,
  ],
  templateUrl: './hierarchy.component.html',
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
