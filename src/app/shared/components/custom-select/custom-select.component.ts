import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnDestroy,
  OnInit,
  Output,
  TemplateRef,
  ViewChild,
  ViewContainerRef,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface SelectOption<T = any> {
  value: T;
  label: string;
}

@Component({
  selector: 'app-custom-select',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './custom-select.component.html',
  styleUrls: ['./custom-select.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomSelectComponent<T = any> implements OnInit, OnDestroy {
  @Input() options: SelectOption<T>[] = [];
  @Input() placeholder = 'Select...';
  @Input() disabled = false;
  @Input() selectedValue: T | null = null;
  @Input() dropdownWidth: number | null = null;
  @Input() maxHeight = 340;
  // CSS selectors for containers that should trigger reposition on scroll (e.g., table wrappers)
  @Input() scrollContainers: string[] = [];

  @Output() valueChange = new EventEmitter<T>();

  @ViewChild('dropdownTemplate', { static: true })
  dropdownTemplate!: TemplateRef<any>;

  isOpen = false;
  filterQuery = '';
  filteredOptions: SelectOption<T>[] = [];

  // Portal-like fields
  private overlayRoot: HTMLElement | null = null;
  private dropdownHost: HTMLElement | null = null;
  private embeddedViewRef: any | null = null;

  private boundReposition = this.reposition.bind(this);
  private scrollElements: HTMLElement[] = [];

  constructor(private elRef: ElementRef<HTMLElement>, private vcr: ViewContainerRef) {}

  ngOnInit(): void {
    this.filteredOptions = [...this.options];
  }

  ngOnDestroy(): void {
    this.closeDropdown();
    this.detachListeners();
  }

  get selectedLabel(): string {
    const match = this.options.find((o) => this.equals(o.value, this.selectedValue));
    return match ? match.label : this.placeholder;
  }

  toggle(event: MouseEvent): void {
    event.stopPropagation();
    if (this.disabled) return;
    this.isOpen ? this.closeDropdown() : this.openDropdown();
  }

  onClear(event: MouseEvent): void {
    event.stopPropagation();
    if (this.disabled) return;
    this.selectValue(null as unknown as T);
  }

  onFilterChange(value: string): void {
    this.filterQuery = value.toLowerCase();
    this.filteredOptions = this.options.filter((o) =>
      o.label.toLowerCase().includes(this.filterQuery)
    );
  }

  selectValue(val: T): void {
    this.selectedValue = val;
    this.valueChange.emit(val);
    this.closeDropdown();
  }

  // Global listeners
  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (!this.isOpen) return;
    if (event.key === 'Escape') {
      this.closeDropdown();
    }
  }

  @HostListener('document:mousedown', ['$event'])
  onDocumentMouseDown(event: MouseEvent): void {
    if (!this.isOpen) return;
    const path = event.composedPath() as EventTarget[];
    const trigger = this.elRef.nativeElement;
    const insideTrigger = path.includes(trigger);
    const insideDropdown = this.dropdownHost ? path.includes(this.dropdownHost) : false;
    if (!insideTrigger && !insideDropdown) {
      this.closeDropdown();
    }
  }

  @HostListener('window:resize')
  onResize(): void {
    if (this.isOpen) this.reposition();
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    if (this.isOpen) this.reposition();
  }

  private openDropdown(): void {
    if (this.isOpen) return;
    this.ensureOverlayRoot();
    this.dropdownHost = document.createElement('div');
    // The overlayRoot is positioned absolute at (0,0) relative to the document.
    // We will position the dropdownHost absolutely within it using document coordinates
    // computed from getBoundingClientRect + window scroll offsets.
    this.dropdownHost.style.position = 'absolute';
    this.dropdownHost.style.zIndex = '1000';
    this.overlayRoot!.appendChild(this.dropdownHost);

    // Render template into host
    this.embeddedViewRef = this.vcr.createEmbeddedView(this.dropdownTemplate);
    this.embeddedViewRef.detectChanges();
    this.embeddedViewRef.rootNodes.forEach((node: Node) => {
      this.dropdownHost!.appendChild(node);
    });

    this.isOpen = true;
    this.filterQuery = '';
    this.filteredOptions = [...this.options];
    this.reposition();
    this.attachScrollListeners();
  }

  private closeDropdown(): void {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.detachListeners();
    if (this.embeddedViewRef) {
      this.embeddedViewRef.destroy();
      this.embeddedViewRef = null;
    }
    if (this.dropdownHost && this.dropdownHost.parentNode) {
      this.dropdownHost.parentNode.removeChild(this.dropdownHost);
    }
    this.dropdownHost = null;
  }

  private reposition(): void {
    if (!this.dropdownHost) return;
    const trigger = this.elRef.nativeElement.querySelector(
      '[data-role="trigger"]'
    ) as HTMLElement;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();

    // Compute dropdown width
    const width = this.dropdownWidth || rect.width;
    const viewportRight = window.scrollX + window.innerWidth;
    const desiredLeft = rect.left + window.scrollX;
    let left = desiredLeft;

    // Flip horizontally if overflowing right
    if (desiredLeft + width > viewportRight) {
      left = rect.right + window.scrollX - width;
    }

    const top = rect.bottom + window.scrollY;

    this.dropdownHost.style.top = `${top}px`;
    this.dropdownHost.style.left = `${Math.max(window.scrollX, left)}px`;
    this.dropdownHost.style.width = `${width}px`;
  }

  private ensureOverlayRoot(): void {
    if (this.overlayRoot && document.body.contains(this.overlayRoot)) return;
    const root = document.createElement('div');
    root.style.position = 'absolute';
    root.style.top = '2px';
    root.style.left = '0';
    root.style.width = '0';
    root.style.height = '0';
    document.body.appendChild(root);
    this.overlayRoot = root;
  }

  private attachScrollListeners(): void {
    this.detachScrollElements();
    if (!this.scrollContainers || this.scrollContainers.length === 0) return;
    this.scrollContainers.forEach((selector) => {
      const el = document.querySelector(selector) as HTMLElement | null;
      if (el) {
        el.addEventListener('scroll', this.boundReposition, { passive: true });
        this.scrollElements.push(el);
      }
    });
  }

  private detachScrollElements(): void {
    this.scrollElements.forEach((el) =>
      el.removeEventListener('scroll', this.boundReposition)
    );
    this.scrollElements = [];
  }

  private detachListeners(): void {
    this.detachScrollElements();
  }

  private equals(a: any, b: any): boolean {
    // Loose equality for primitive ids; customize if needed
    return a === b;
  }
}


