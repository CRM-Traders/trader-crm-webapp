import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NoteCreationModalComponent } from './note-creation-modal.component';

describe('NoteCreationModalComponent', () => {
  let component: NoteCreationModalComponent;
  let fixture: ComponentFixture<NoteCreationModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NoteCreationModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NoteCreationModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
