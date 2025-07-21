import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  Output,
  ElementRef,
  HostListener,
  OnInit,
  OnDestroy,
  inject,
} from '@angular/core';
import {
  trigger,
  state,
  style,
  transition,
  animate,
} from '@angular/animations';
import { GridAction } from '../../models/grid/grid-column.model';
import { HasPermissionDirective } from '../../../core/directives/has-permission.directive';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-grid-action-buttons',
  standalone: true,
  imports: [CommonModule, HasPermissionDirective],
  templateUrl: './grid-action-buttons.component.html',
  styleUrls: ['./grid-action-buttons.component.scss'],
  animations: [
    trigger('dropdownAnimation', [
      state(
        'void',
        style({
          opacity: 0,
          transform: 'translateY(-8px) scale(0.95)',
        })
      ),
      state(
        '*',
        style({
          opacity: 1,
          transform: 'translateY(0) scale(1)',
        })
      ),
      transition('void => *', [animate('200ms ease-out')]),
      transition('* => void', [animate('150ms ease-in')]),
    ]),
  ],
})
export class GridActionButtonsComponent implements OnInit, OnDestroy {
  @Input() actions: GridAction[] = [];
  @Input() item: any = null;
  @Input() maxPrimaryActions = 2;
  @Input() isBottomRow = false; // New input to detect bottom rows

  @Output() actionExecuted = new EventEmitter<GridAction>();

  isDropdownOpen = false;
  dropdownPosition: 'bottom' | 'top' = 'bottom';

  constructor(private elementRef: ElementRef) {}

  ngOnInit(): void {
    document.addEventListener('click', this.handleGlobalClick.bind(this));
  }

  ngOnDestroy(): void {
    // Clean up global click listener
    document.removeEventListener('click', this.handleGlobalClick.bind(this));
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.isDropdownOpen) {
      this.closeDropdown();
    }
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    if (this.isDropdownOpen) {
      this.calculateDropdownPosition();
    }
  }

  handleGlobalClick(event: Event): void {
    if (
      this.isDropdownOpen &&
      !this.elementRef.nativeElement.contains(event.target as Node)
    ) {
      this.closeDropdown();
    }
  }

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

    if (this.isDropdownOpen) {
      this.calculateDropdownPosition();
    }
  }

  closeDropdown(): void {
    this.isDropdownOpen = false;
  }

  executeAction(action: GridAction, event: Event): void {
    event.stopPropagation();

    if (!this.isActionDisabled(action)) {
      this.actionExecuted.emit(action);
      this.closeDropdown();
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

  trackByAction(index: number, action: GridAction): string {
    return action.label || index.toString();
  }

  private calculateDropdownPosition(): void {
    // Use setTimeout to ensure DOM is updated
    setTimeout(() => {
      const buttonElement =
        this.elementRef.nativeElement.querySelector('.dropdown-button');
      const dropdownElement =
        this.elementRef.nativeElement.querySelector('.dropdown-menu');

      if (!buttonElement || !dropdownElement) return;

      const buttonRect = buttonElement.getBoundingClientRect();
      const dropdownHeight = dropdownElement.offsetHeight;
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;

      // Check available space
      const spaceBelow = viewportHeight - buttonRect.bottom;
      const spaceAbove = buttonRect.top;
      const spaceRight = viewportWidth - buttonRect.right;
      const spaceLeft = buttonRect.left;

      // Minimum space needed for dropdown
      const minSpace = dropdownHeight + 16; // 16px buffer

      // For bottom rows, always position above
      if (this.isBottomRow) {
        this.dropdownPosition = 'top';
      } else {
        // Determine vertical position for other rows
        if (spaceBelow < minSpace && spaceAbove > minSpace) {
          this.dropdownPosition = 'top';
        } else {
          this.dropdownPosition = 'bottom';
        }
      }

      // Adjust horizontal position if needed (for edge cases)
      if (spaceRight < 200) {
        // dropdown width is 192px (w-48)
        dropdownElement.style.right = '0';
        dropdownElement.style.left = 'auto';
      }
    }, 0);
  }
}
