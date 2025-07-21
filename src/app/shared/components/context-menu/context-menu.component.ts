import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  HostListener,
  Input,
  Output,
} from '@angular/core';
import { GridAction } from '../../models/grid/grid-column.model';
import { HasPermissionDirective } from '../../../core/directives/has-permission.directive';

@Component({
  selector: 'app-context-menu',
  standalone: true,
  imports: [CommonModule, HasPermissionDirective],
  template: `
    <div
      *ngIf="visible"
      class="context-menu fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-300/30 rounded-md shadow-lg py-1 min-w-48"
      [style.left.px]="position.x"
      [style.top.px]="position.y"
    >
      <ng-container *ngFor="let action of actions">
        <ng-container *hasPermission="action.permission">
          <hr
            *ngIf="action.separator"
            class="border-gray-200 dark:border-gray-600 my-1"
          />
          <button
            *ngIf="!action.separator && isActionVisible(action)"
            [disabled]="isActionDisabled(action)"
            (click)="executeAction(action)"
            class="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-300/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            [ngClass]="{
              'text-gray-700 dark:text-gray-200': !isActionDisabled(action),
              'text-gray-400 dark:text-gray-500': isActionDisabled(action),
              'text-red-600 dark:text-red-400':
                action.type === 'danger' && !isActionDisabled(action),
              'text-green-600 dark:text-green-400':
                action.type === 'success' && !isActionDisabled(action),
              'text-blue-600 dark:text-blue-400':
                action.type === 'primary' && !isActionDisabled(action),
              'text-yellow-600 dark:text-yellow-400':
                action.type === 'warning' && !isActionDisabled(action)
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
      </ng-container>
    </div>
  `,
  styles: [
    `
      .context-menu {
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
      }
    `,
  ],
})
export class ContextMenuComponent {
  @Input() visible = false;
  @Input() position = { x: 0, y: 0 };
  @Input() actions: GridAction[] = [];
  @Input() item: any = null;

  @Output() actionExecuted = new EventEmitter<GridAction>();
  @Output() menuClosed = new EventEmitter<void>();

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    this.closeMenu();
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    this.closeMenu();
  }

  executeAction(action: GridAction): void {
    if (!this.isActionDisabled(action)) {
      this.actionExecuted.emit(action);
      this.closeMenu();
    }
  }

  closeMenu(): void {
    this.visible = false;
    this.menuClosed.emit();
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
