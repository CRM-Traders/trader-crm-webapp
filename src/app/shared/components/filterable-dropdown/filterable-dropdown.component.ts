// src/app/shared/components/filterable-dropdown/filterable-dropdown.component.ts

import {
  Component,
  Input,
  Output,
  EventEmitter,
  forwardRef,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
} from '@angular/forms';
import {
  Subject,
  Observable,
  BehaviorSubject,
  combineLatest,
  of,
  debounceTime,
  distinctUntilChanged,
  switchMap,
  map,
  catchError,
  takeUntil,
  tap,
} from 'rxjs';

export interface DropdownItem {
  value: string;
  label: string;
}

export interface DropdownSearchParams {
  globalFilter?: string;
  pageIndex?: number;
  pageSize?: number;
}

export interface DropdownSearchResponse<T = DropdownItem> {
  items: T[];
  totalCount: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

@Component({
  selector: 'app-filterable-dropdown',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => FilterableDropdownComponent),
      multi: true,
    },
  ],
  template: `
    <div class="relative" [class]="containerClass">
      <!-- Input Field -->
      <div class="relative">
        <input
          #searchInput
          type="text"
          [value]="displayValue"
          (input)="onSearchInput($event)"
          (focus)="onInputFocus()"
          (blur)="onInputBlur()"
          (keydown)="onKeyDown($event)"
          [placeholder]="placeholder"
          [disabled]="disabled"
          [class]="inputClass"
          [class.border-red-500]="hasError"
          [class.focus:ring-red-500]="hasError"
          autocomplete="off"
        />

        <!-- Clear Button -->
        <button
          *ngIf="selectedValue && !disabled"
          type="button"
          class="absolute right-8 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          (click)="clearSelection()"
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
              d="M6 18L18 6M6 6l12 12"
            ></path>
          </svg>
        </button>

        <!-- Dropdown Arrow -->
        <div
          class="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none"
        >
          <svg
            class="w-4 h-4 text-gray-400 transition-transform duration-200"
            [class.rotate-180]="isOpen"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M19 9l-7 7-7-7"
            ></path>
          </svg>
        </div>
      </div>

      <!-- Dropdown Menu -->
      <div
        *ngIf="isOpen"
        class="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-hidden"
      >
        <!-- Loading Indicator -->
        <div
          *ngIf="loading && items.length === 0"
          class="px-3 py-2 text-sm text-gray-500 dark:text-gray-400 text-center"
        >
          <svg
            class="animate-spin -ml-1 mr-2 h-4 w-4 inline"
            xmlns="http://www.w3.org/2000/svg"
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
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          Loading...
        </div>

        <div
          *ngIf="!loading && items.length === 0 && searchTerm"
          class="px-3 py-2 text-sm text-gray-500 dark:text-gray-400 text-center"
        >
          No results found for "{{ searchTerm }}"
        </div>

        <!-- Items List -->
        <div
          *ngIf="items.length > 0"
          class="max-h-60 overflow-y-auto"
          #scrollContainer
          (scroll)="onScroll($event)"
        >
          <div
            *ngFor="let item of items; trackBy: trackByValue; let i = index"
            class="px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 text-sm border-b border-gray-100 dark:border-gray-700 last:border-b-0"
            [ngClass]="{
              'bg-blue-50 text-blue-700': item.value === selectedValue,
              'dark:bg-blue-900/20 dark:text-blue-300':
                item.value === selectedValue,
              'bg-gray-100':
                highlightedIndex === i && item.value !== selectedValue,
              'dark:bg-gray-600':
                highlightedIndex === i && item.value !== selectedValue
            }"
            (click)="selectItem(item)"
            (mouseenter)="highlightedIndex = i"
          >
            {{ item.label }}
          </div>

          <div
            *ngIf="loading && items.length > 0"
            class="px-3 py-2 text-sm text-gray-500 dark:text-gray-400 text-center border-t border-gray-100 dark:border-gray-700"
          >
            <svg
              class="animate-spin -ml-1 mr-2 h-4 w-4 inline"
              xmlns="http://www.w3.org/2000/svg"
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
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            Loading more...
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .animate-spin {
        animation: spin 1s linear infinite;
      }
      @keyframes spin {
        from {
          transform: rotate(0deg);
        }
        to {
          transform: rotate(360deg);
        }
      }
    `,
  ],
})
export class FilterableDropdownComponent
  implements ControlValueAccessor, OnInit, OnDestroy
{
  @Input() placeholder = 'Select an option';
  @Input() disabled = false;
  @Input() hasError = false;
  @Input() containerClass = '';
  @Input() inputClass =
    'w-full px-3 py-2 pr-10 border rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors';
  @Input() pageSize = 20;
  @Input() searchFunction!: (
    params: DropdownSearchParams
  ) => Observable<DropdownSearchResponse>;

  @Output() selectionChange = new EventEmitter<DropdownItem | null>();

  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;
  @ViewChild('scrollContainer') scrollContainer!: ElementRef<HTMLDivElement>;

  // Component state
  isOpen = false;
  items: DropdownItem[] = [];
  loading = false;
  selectedValue: string | null = null;
  displayValue = '';
  searchTerm = '';
  highlightedIndex = -1;

  // Pagination state
  private currentPage = 0;
  private hasMorePages = true;
  private totalCount = 0;

  // Observables
  private searchSubject = new BehaviorSubject<string>('');
  private loadMoreSubject = new Subject<void>();
  private destroy$ = new Subject<void>();

  // ControlValueAccessor
  private onChange = (value: string | null) => {};
  private onTouched = () => {};

  ngOnInit() {
    this.setupSearch();
    this.setupLoadMore();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupSearch() {
    this.searchSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$),
        tap(() => {
          this.resetPagination();
          this.loading = true;
        }),
        switchMap((searchTerm) =>
          this.searchFunction({
            globalFilter: searchTerm || undefined,
            pageIndex: 0,
            pageSize: this.pageSize,
          }).pipe(
            catchError((error) => {
              return of({
                items: [],
                totalCount: 0,
                hasNextPage: false,
                hasPreviousPage: false,
              });
            })
          )
        )
      )
      .subscribe((response) => {
        this.items = response.items;
        this.totalCount = response.totalCount;
        this.hasMorePages = response.hasNextPage;
        this.currentPage = 0;
        this.loading = false;
      });
  }

  private setupLoadMore() {
    this.loadMoreSubject
      .pipe(
        takeUntil(this.destroy$),
        tap(() => {
          this.loading = true;
        }),
        switchMap(() =>
          this.searchFunction({
            globalFilter: this.searchTerm || undefined,
            pageIndex: this.currentPage + 1,
            pageSize: this.pageSize,
          }).pipe(
            catchError((error) => {
              return of({
                items: [],
                totalCount: 0,
                hasNextPage: false,
                hasPreviousPage: false,
              });
            })
          )
        )
      )
      .subscribe((response) => {
        this.items = [...this.items, ...response.items];
        this.hasMorePages = response.hasNextPage;
        this.currentPage++;
        this.loading = false;
      });
  }

  onSearchInput(event: Event) {
    const target = event.target as HTMLInputElement;
    this.searchTerm = target.value;
    this.displayValue = target.value;
    this.searchSubject.next(this.searchTerm);

    if (!this.isOpen) {
      this.openDropdown();
    }
  }

  onInputFocus() {
    this.openDropdown();
    if (this.items.length === 0 && !this.loading) {
      this.searchSubject.next('');
    }
  }

  onInputBlur() {
    setTimeout(() => {
      this.closeDropdown();
    }, 200);
  }

  onKeyDown(event: KeyboardEvent) {
    if (!this.isOpen) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.highlightedIndex = Math.min(
          this.highlightedIndex + 1,
          this.items.length - 1
        );
        this.scrollToHighlighted();
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.highlightedIndex = Math.max(this.highlightedIndex - 1, -1);
        this.scrollToHighlighted();
        break;
      case 'Enter':
        event.preventDefault();
        if (this.highlightedIndex >= 0 && this.items[this.highlightedIndex]) {
          this.selectItem(this.items[this.highlightedIndex]);
        }
        break;
      case 'Escape':
        event.preventDefault();
        this.closeDropdown();
        break;
    }
  }

  onScroll(event: Event) {
    const element = event.target as HTMLElement;
    const threshold = 10;

    if (
      element.scrollHeight - element.scrollTop - element.clientHeight <
        threshold &&
      this.hasMorePages &&
      !this.loading
    ) {
      this.loadMoreSubject.next();
    }
  }

  private scrollToHighlighted() {
    if (this.highlightedIndex >= 0 && this.scrollContainer) {
      const container = this.scrollContainer.nativeElement;
      const items = container.children;
      if (items[this.highlightedIndex]) {
        items[this.highlightedIndex].scrollIntoView({
          block: 'nearest',
          behavior: 'smooth',
        });
      }
    }
  }

  selectItem(item: DropdownItem) {
    this.selectedValue = item.value;
    this.displayValue = item.label;
    this.searchTerm = item.label;
    this.closeDropdown();
    this.onChange(item.value);
    this.onTouched();
    this.selectionChange.emit(item);
  }

  clearSelection() {
    this.selectedValue = null;
    this.displayValue = '';
    this.searchTerm = '';
    this.onChange(null);
    this.onTouched();
    this.selectionChange.emit(null);
    this.searchInput?.nativeElement.focus();
  }

  private openDropdown() {
    this.isOpen = true;
    this.highlightedIndex = -1;
  }

  private closeDropdown() {
    this.isOpen = false;
    this.highlightedIndex = -1;

    if (this.selectedValue) {
      const selectedItem = this.items.find(
        (item) => item.value === this.selectedValue
      );
      if (selectedItem) {
        this.displayValue = selectedItem.label;
        this.searchTerm = selectedItem.label;
      }
    } else {
      this.displayValue = '';
      this.searchTerm = '';
    }
  }

  private resetPagination() {
    this.currentPage = 0;
    this.hasMorePages = true;
    this.items = [];
  }

  trackByValue(index: number, item: DropdownItem): string {
    return item.value;
  }

  // ControlValueAccessor implementation
  writeValue(value: string | null): void {
    this.selectedValue = value;
    if (value && this.items.length > 0) {
      const selectedItem = this.items.find((item) => item.value === value);
      if (selectedItem) {
        this.displayValue = selectedItem.label;
        this.searchTerm = selectedItem.label;
      }
    } else {
      this.displayValue = '';
      this.searchTerm = '';
    }
  }

  registerOnChange(fn: (value: string | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }
}
