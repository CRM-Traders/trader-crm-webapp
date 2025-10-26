import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChatWindowsComponent } from './chat-windows.component';

describe('ChatWindowsComponent', () => {
  let component: ChatWindowsComponent;
  let fixture: ComponentFixture<ChatWindowsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChatWindowsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChatWindowsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
