import {
  Component,
  OnInit,
  OnDestroy,
  HostListener,
  inject,
  ViewChild,
  ViewContainerRef,
  ComponentRef,
  Type,
  TemplateRef,
  ContentChild,
  Input,
  Output,
  EventEmitter,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { ThemeService } from '../../../core/services/theme.service';
import {
  ModalData,
  ModalRef,
  ModalConfig,
} from '../../models/modals/modal.model';
import { ModalService } from '../../services/modals/modal.service';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.scss'],
})
export class ModalComponent implements OnInit, OnDestroy {
  private modalService = inject(ModalService);
  private themeService = inject(ThemeService);
  private destroy$ = new Subject<void>();

  @ViewChild('dynamicContent', { read: ViewContainerRef, static: false })
  dynamicContent!: ViewContainerRef;

  @ContentChild('modalHeader') headerTemplate?: TemplateRef<any>;
  @ContentChild('modalBody') bodyTemplate?: TemplateRef<any>;
  @ContentChild('modalFooter') footerTemplate?: TemplateRef<any>;

  @Input() id?: string;
  @Input() size: 'sm' | 'md' | 'lg' | 'xl' | 'full' = 'md';
  @Input() closable = true;
  @Input() backdrop = true;
  @Input() keyboard = true;
  @Input() centered = false;
  @Input() scrollable = false;
  @Input() animation = true;
  @Input() customClass = '';
  @Input() component?: Type<any>;
  @Input() data?: ModalData;

  @Output() opened = new EventEmitter<void>();
  @Output() closed = new EventEmitter<any>();
  @Output() dismissed = new EventEmitter<any>();

  modals: ModalRef[] = [];
  isDarkMode = false;
  private componentRefs: ComponentRef<any>[] = [];

  ngOnInit(): void {
    this.themeService.isDarkMode$
      .pipe(takeUntil(this.destroy$))
      .subscribe((isDark) => {
        this.isDarkMode = isDark;
      });

    this.modalService.modals$
      .pipe(takeUntil(this.destroy$))
      .subscribe((modals) => {
        this.modals = modals;
        // Delay rendering to ensure ViewChild is available
        setTimeout(() => {
          this.renderDynamicComponents();
        }, 100);
      });

    if (this.component) {
      this.openComponentModal();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.clearDynamicComponents();
  }

  @HostListener('document:keydown.escape', ['$event'])
  onEscapeKey(event: KeyboardEvent): void {
    if (this.modals.length > 0) {
      const topModal = this.modals[this.modals.length - 1];
      if (topModal.config.keyboard) {
        this.dismissModal(topModal.id, 'escape');
      }
    }
  }

  openComponentModal(): void {
    if (this.component) {
      const config: ModalConfig = {
        id: this.id,
        size: this.size,
        closable: this.closable,
        backdrop: this.backdrop,
        keyboard: this.keyboard,
        centered: this.centered,
        scrollable: this.scrollable,
        animation: this.animation,
        customClass: this.customClass,
      };

      const modalRef = this.modalService.open(
        this.component,
        config,
        this.data
      );

      modalRef.result.then(
        (result) => this.closed.emit(result),
        (reason) => this.dismissed.emit(reason)
      );

      this.opened.emit();
    }
  }

  onBackdropClick(modalId: string): void {
    const modal = this.modals.find((m) => m.id === modalId);
    if (modal && modal.config.backdrop && modal.config.closable) {
      this.dismissModal(modalId, 'backdrop');
    }
  }

  closeModal(modalId: string, result?: any): void {
    const modal = this.modals.find((m) => m.id === modalId);
    if (modal) {
      modal.close(result);
    }
  }

  dismissModal(modalId: string, reason?: any): void {
    const modal = this.modals.find((m) => m.id === modalId);
    if (modal) {
      modal.dismiss(reason);
    }
  }

  getModalSizeClass(size: string): string {
    const sizeClasses = {
      sm: 'max-w-sm',
      md: 'max-w-md',
      lg: 'max-w-lg',
      xl: 'max-w-xl',
      full: 'max-w-full mx-4',
    };
    return sizeClasses[size as keyof typeof sizeClasses] || sizeClasses.md;
  }

  getModalPositionClass(centered: boolean): string {
    return centered ? 'items-center' : 'items-start pt-16';
  }

  private renderDynamicComponents(): void {
    this.clearDynamicComponents();

    if (!this.dynamicContent || this.modals.length === 0) {
      return;
    }

    // Create components for each modal
    this.modals.forEach((modal, index) => {
      if (modal.component) {
        const componentRef = this.dynamicContent.createComponent(
          modal.component
        );

        // Pass data to the component
        if (modal.data && componentRef.instance) {
          const instance = componentRef.instance as Record<string, any>;
          Object.keys(modal.data).forEach((key) => {
            if (
              typeof instance === 'object' &&
              instance !== null &&
              key in instance
            ) {
              instance[key] = modal.data![key];
            }
          });
        }

        // Pass modal reference to the component
        if (componentRef.instance) {
          const instance = componentRef.instance as Record<string, any>;
          if (
            typeof instance === 'object' &&
            instance !== null &&
            'modalRef' in instance
          ) {
            instance['modalRef'] = modal;
          }
        }

        // Trigger change detection
        componentRef.changeDetectorRef.detectChanges();
        this.componentRefs.push(componentRef);
      }
    });
  }

  private clearDynamicComponents(): void {
    this.componentRefs.forEach((ref) => ref.destroy());
    this.componentRefs = [];

    if (this.dynamicContent) {
      this.dynamicContent.clear();
    }
  }

  trackByModalId(index: number, modal: ModalRef): string {
    return modal.id;
  }

  stopPropagation(event: Event): void {
    event.stopPropagation();
  }
}
