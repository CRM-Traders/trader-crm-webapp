import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CallbackCreationModalComponent } from './callback-creation-modal.component';

describe('CallbackCreationModalComponent', () => {
  let component: CallbackCreationModalComponent;
  let fixture: ComponentFixture<CallbackCreationModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CallbackCreationModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CallbackCreationModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
