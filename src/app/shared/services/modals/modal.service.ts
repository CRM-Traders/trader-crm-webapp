import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import {
  ModalRef,
  ModalConfig,
  ModalData,
} from '../../models/modals/modal.model';

@Injectable({
  providedIn: 'root',
})
export class ModalService {
  private modals = new BehaviorSubject<ModalRef[]>([]);
  private modalCounter = 0;

  public modals$ = this.modals.asObservable();

  open<T = any>(
    component: any,
    config: ModalConfig = {},
    data?: ModalData
  ): ModalRef {
    const modalId = config.id || `modal-${++this.modalCounter}`;

    const defaultConfig: ModalConfig = {
      size: 'md',
      closable: true,
      backdrop: true,
      keyboard: true,
      centered: false,
      scrollable: false,
      animation: true,
      ...config,
    };

    let resolveResult: (value: any) => void;
    let resolveDismissed: (reason: any) => void;

    const result = new Promise<any>((resolve) => {
      resolveResult = resolve;
    });

    const dismissed = new Promise<any>((resolve) => {
      resolveDismissed = resolve;
    });

    const modalRef: ModalRef = {
      id: modalId,
      config: defaultConfig,
      data,
      result,
      dismissed,
      close: (result?: any) => {
        this.closeModal(modalId);
        resolveResult(result);
      },
      dismiss: (reason?: any) => {
        this.closeModal(modalId);
        resolveDismissed(reason);
      },
    };

    // Store component reference for dynamic rendering
    if (component) {
      modalRef.component = component;
    }

    const currentModals = this.modals.value;
    this.modals.next([...currentModals, modalRef]);

    return modalRef;
  }

  closeModal(modalId: string): void {
    const currentModals = this.modals.value;
    const updatedModals = currentModals.filter((modal) => modal.id !== modalId);
    this.modals.next(updatedModals);
  }

  closeAll(): void {
    this.modals.next([]);
  }

  getModal(modalId: string): ModalRef | undefined {
    return this.modals.value.find((modal) => modal.id === modalId);
  }

  hasOpenModals(): boolean {
    return this.modals.value.length > 0;
  }
}
