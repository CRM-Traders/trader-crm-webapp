import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { ChatStateService } from '../../services/chat-state.service';
import { ChatWindowComponent } from '../chat-window/chat-window.component';
import { ChatWindowState } from '../../models/chat.model';

@Component({
  selector: 'app-chat-windows',
  standalone: true,
  imports: [CommonModule, ChatWindowComponent],
  template: `
    <ng-container *ngFor="let window of openWindows; trackBy: trackByWindow">
      <app-chat-window
        *ngIf="!window.isMinimized"
        [chatId]="window.chatId"
      ></app-chat-window>
    </ng-container>
  `,
})
export class ChatWindowsComponent implements OnInit, OnDestroy {
  private chatStateService = inject(ChatStateService);

  openWindows: ChatWindowState[] = [];
  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.chatStateService.state
      .pipe(takeUntil(this.destroy$))
      .subscribe((state) => {
        this.openWindows = state.openWindows.filter((w) => !w.isMinimized);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  trackByWindow(index: number, window: ChatWindowState): string {
    return window.chatId;
  }
}
