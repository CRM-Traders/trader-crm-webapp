import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalService } from '../../shared/services/modals/modal.service';
import { OffersService } from './services/offers.service';
import { OfferResponse } from '../../shared/models/offers/offer.model';
import { OfferFormModalComponent } from './components/offer-form-modal/offer-form-modal.component';
import { Subject, takeUntil } from 'rxjs';
import { AlertService } from '../../core/services/alert.service';
import { ConfirmationDialogComponent } from '../../shared/components/confirmation-dialog/confirmation-dialog.component';

@Component({
  selector: 'app-offers',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './offers.component.html',
  styleUrl: './offers.component.scss',
})
export class OffersComponent implements OnInit, OnDestroy {
  private modalService = inject(ModalService);
  private offersService = inject(OffersService);
  private alertService = inject(AlertService);
  private destroy$ = new Subject<void>();

  offers: OfferResponse[] = [];

  ngOnInit(): void {
    this.offersService.offers$
      .pipe(takeUntil(this.destroy$))
      .subscribe((items) => (this.offers = items));
    this.offersService.loadFromApi();
  }

  addOffer(): void {
    const modalRef = this.modalService.open(OfferFormModalComponent, {
      size: 'md',
      centered: true,
      closable: true,
    });

    modalRef.result.then((result) => {
      if (result) {
        this.offers = this.offersService.getAll();
      }
    });
  }

  editOffer(offer: OfferResponse): void {
    this.offersService
      .getById(offer.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe((fresh) => {
        if (!fresh) {
          this.alertService.error('Offer not found');
          return;
        }
        const modalRef = this.modalService.open(
          OfferFormModalComponent,
          { size: 'md', centered: true, closable: true },
          { offer: fresh }
        );
        modalRef.result.then((result) => {
          if (result) {
            this.offers = this.offersService.getAll();
          }
        });
      });
  }

  deleteOffer(offer: OfferResponse): void {
    const modalRef = this.modalService.open(
      ConfirmationDialogComponent,
      { size: 'md', centered: true, closable: true },
      {
        data: {
          title: 'Delete Offer',
          message: `Are you sure you want to delete "${offer.title}"?`,
          type: 'danger',
          confirmText: 'Delete',
          cancelText: 'Cancel',
        },
      }
    );

    modalRef.result.then((confirmed) => {
      if (confirmed) {
        this.offersService.delete(offer.id).subscribe();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}

