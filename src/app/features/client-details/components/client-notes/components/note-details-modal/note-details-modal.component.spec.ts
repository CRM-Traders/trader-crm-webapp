import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NoteDetailsModalComponent } from './note-details-modal.component';

describe('NoteDetailsModalComponent', () => {
  let component: NoteDetailsModalComponent;
  let fixture: ComponentFixture<NoteDetailsModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NoteDetailsModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NoteDetailsModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

