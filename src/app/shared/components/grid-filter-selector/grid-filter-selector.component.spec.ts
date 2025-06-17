import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GridFilterSelectorComponent } from './grid-filter-selector.component';

describe('GridFilterSelectorComponent', () => {
  let component: GridFilterSelectorComponent;
  let fixture: ComponentFixture<GridFilterSelectorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GridFilterSelectorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GridFilterSelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
