import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MinimizedChatsComponent } from './minimized-chats.component';

describe('MinimizedChatsComponent', () => {
  let component: MinimizedChatsComponent;
  let fixture: ComponentFixture<MinimizedChatsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MinimizedChatsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MinimizedChatsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
