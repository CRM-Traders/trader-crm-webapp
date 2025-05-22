import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { GridAction } from '../../models/grid/grid-column.model';

@Component({
  selector: 'app-grid-action-buttons',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex items-center space-x-1">
      <ng-container *ngFor="let action of primaryActions">
        <button
          *ngIf="isActionVisible(action)"
          [disabled]="isActionDisabled(action)"
          (click)="executeAction(action, $event)"
          [title]="action.label"
          class="inline-flex items-center justify-center w-8 h-8 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 hover:bg-gray-600 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          [ngClass]="{
            'text-gray-700 dark:text-gray-200':
              !isActionDisabled(action) && action.type !== 'danger',
            'text-red-600 dark:text-red-400':
              !isActionDisabled(action) && action.type === 'danger',
            'text-green-600 dark:text-green-400':
              !isActionDisabled(action) && action.type === 'success',
            'text-blue-600 dark:text-blue-400':
              !isActionDisabled(action) && action.type === 'primary',
            'text-yellow-600 dark:text-yellow-400':
              !isActionDisabled(action) && action.type === 'warning',
            'border-red-300 dark:border-red-600 hover:bg-red-50 dark:hover:bg-red-900/20':
              action.type === 'danger' && !isActionDisabled(action),
            'border-green-300 dark:border-green-600 hover:bg-green-50 dark:hover:bg-green-900/20':
              action.type === 'success' && !isActionDisabled(action),
            'border-blue-300 dark:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20':
              action.type === 'primary' && !isActionDisabled(action),
            'border-yellow-300 dark:border-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20':
              action.type === 'warning' && !isActionDisabled(action)
          }"
        >
          <img
            *ngIf="action.icon"
            [src]="getIconSvg(action.icon)"
            class="w-4 h-4 mr-2"
            [alt]="action.label"
          />
        </button>
      </ng-container>

      <!-- More actions dropdown -->
      <div *ngIf="secondaryActions.length > 0" class="relative inline-block">
        <button
          (click)="toggleDropdown($event)"
          class="inline-flex items-center justify-center w-8 h-8 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
          [ngClass]="{ 'bg-gray-50 dark:bg-gray-600': isDropdownOpen }"
        >
          <svg
            class="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
            />
          </svg>
        </button>

        <!-- Dropdown menu -->
        <div
          *ngIf="isDropdownOpen"
          class="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg py-1 z-10"
        >
          <ng-container *ngFor="let action of secondaryActions">
            <hr
              *ngIf="action.separator"
              class="border-gray-200 dark:border-gray-600 my-1"
            />
            <button
              *ngIf="!action.separator && isActionVisible(action)"
              [disabled]="isActionDisabled(action)"
              (click)="executeAction(action, $event)"
              class="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              [ngClass]="{
                'text-gray-700 dark:text-gray-200':
                  !isActionDisabled(action) && action.type !== 'danger',
                'text-red-600 dark:text-red-400':
                  !isActionDisabled(action) && action.type === 'danger',
                'text-green-600 dark:text-green-400':
                  !isActionDisabled(action) && action.type === 'success',
                'text-blue-600 dark:text-blue-400':
                  !isActionDisabled(action) && action.type === 'primary',
                'text-yellow-600 dark:text-yellow-400':
                  !isActionDisabled(action) && action.type === 'warning'
              }"
            >
              <img
                *ngIf="action.icon"
                [src]="getIconSvg(action.icon)"
                class="w-4 h-4 mr-2"
                [alt]="action.label"
              />
              {{ action.label }}
            </button>
          </ng-container>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: inline-block;
      }
    `,
  ],
})
export class GridActionButtonsComponent {
  @Input() actions: GridAction[] = [];
  @Input() item: any = null;
  @Input() maxPrimaryActions = 2;

  @Output() actionExecuted = new EventEmitter<GridAction>();

  isDropdownOpen = false;

  get primaryActions(): GridAction[] {
    return this.visibleActions.slice(0, this.maxPrimaryActions);
  }

  get secondaryActions(): GridAction[] {
    return this.visibleActions.slice(this.maxPrimaryActions);
  }

  get visibleActions(): GridAction[] {
    return this.actions.filter((action) => this.isActionVisible(action));
  }

  toggleDropdown(event: Event): void {
    event.stopPropagation();
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  executeAction(action: GridAction, event: Event): void {
    event.stopPropagation();

    if (!this.isActionDisabled(action)) {
      this.actionExecuted.emit(action);
      this.isDropdownOpen = false;
    }
  }

  isActionVisible(action: GridAction): boolean {
    if (typeof action.visible === 'function') {
      return action.visible(this.item);
    }
    return action.visible !== false;
  }

  isActionDisabled(action: GridAction): boolean {
    if (typeof action.disabled === 'function') {
      return action.disabled(this.item);
    }
    return action.disabled === true;
  }

  getIconSvg(iconName: string): string {
    const iconBasePath = 'icons/';
    const iconPath = `${iconBasePath}${iconName}.svg`;

    return iconPath;
  }

  getSpriteIcon(iconName: string): string {
    return `#icon-${iconName}`;
  }

  getSpritePath(): string {
    return 'icons/sprite.svg';
  }
}
