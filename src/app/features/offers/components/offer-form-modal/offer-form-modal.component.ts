import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ModalRef } from '../../../../shared/models/modals/modal.model';
import { OfferRequest, OfferResponse } from '../../../../shared/models/offers/offer.model';
import { OffersService } from '../../services/offers.service';

@Component({
  selector: 'app-offer-form-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './offer-form-modal.component.html',
  styleUrls: ['./offer-form-modal.component.scss'],
})
export class OfferFormModalComponent implements OnInit {
  @Input() modalRef!: ModalRef;
  @Input() offer?: OfferResponse;

  private fb = inject(FormBuilder);
  private offersService = inject(OffersService);

  form = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(200)]],
    listingPrice: [null as number | null, [Validators.required, Validators.min(0)]],
    listingOn: ['', [Validators.required]],
    preSalePrice: [null as number | null, [Validators.min(0)]],
    logoUrl: ['', [Validators.required]],
  });

  ngOnInit(): void {
    if (this.offer) {
      const dateForInput = (this.offer.listingOn || '').slice(0, 16);
      this.form.patchValue({
        title: this.offer.title,
        listingPrice: this.offer.listingPrice,
        listingOn: dateForInput,
        preSalePrice: this.offer.preSalePrice ?? null,
        logoUrl: this.offer.logoUrl,
      });
    } else {
      const today = new Date().toISOString().slice(0, 16);
      this.form.patchValue({ listingOn: today });
    }
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const req: OfferRequest = this.form.getRawValue() as OfferRequest;
    if (this.offer) {
      const updated = this.offersService.update(this.offer.id, req);
      this.modalRef.close(updated);
    } else {
      const created = this.offersService.add(req);
      this.modalRef.close(created);
    }
  }

  cancel(): void {
    this.modalRef.dismiss();
  }
}


