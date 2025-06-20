import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WalletTransactionModalComponent } from './wallet-transaction-modal.component';

describe('WalletTransactionModalComponent', () => {
  let component: WalletTransactionModalComponent;
  let fixture: ComponentFixture<WalletTransactionModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WalletTransactionModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WalletTransactionModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
