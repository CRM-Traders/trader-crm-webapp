import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SectionSwitchDialogComponent } from './section-switch-dialog.component';

describe('SectionSwitchDialogComponent', () => {
  let component: SectionSwitchDialogComponent;
  let fixture: ComponentFixture<SectionSwitchDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SectionSwitchDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SectionSwitchDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
