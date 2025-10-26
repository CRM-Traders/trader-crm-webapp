import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil, combineLatest } from 'rxjs';
import { ChatStateService } from '../../services/chat-state.service';
import { ChatService } from '../../services/chat.service';
import { Chat, ChatWindowState } from '../../models/chat.model';

interface MinimizedChatDisplay {
  chatId: string;
  chat?: Chat;
  position: number;
  unreadCount: number;
}

@Component({
  selector: 'app-minimized-chats',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './minimized-chats.component.html',
  styleUrl: './minimized-chats.component.scss',
})
export class MinimizedChatsComponent implements OnInit, OnDestroy {
  private chatStateService = inject(ChatStateService);
  private chatService = inject(ChatService);

  minimizedChats: MinimizedChatDisplay[] = [];
  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    // Combine state and chats to get full display data
    combineLatest([this.chatStateService.state, this.chatService.chats])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([state, chats]) => {
        const minimizedWindows = state.openWindows.filter((w) => w.isMinimized);

        this.minimizedChats = minimizedWindows.map((window, index) => {
          const chat = chats.find((c) => c.id === window.chatId);
          return {
            chatId: window.chatId,
            chat,
            position: index,
            unreadCount: chat?.unreadCount || 0,
          };
        });
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  maximizeChat(chatId: string): void {
    this.chatStateService.maximizeWindow(chatId);
  }

  closeChat(chatId: string, event: MouseEvent): void {
    event.stopPropagation();
    this.chatStateService.closeChatWindow(chatId);
  }

  getChatName(chat?: Chat): string {
    return chat?.name || 'Chat';
  }

  getChatAvatar(chat?: Chat): string {
    return chat?.name.charAt(0).toUpperCase() || '?';
  }

  getOnlineStatus(chat?: Chat): boolean {
    return chat?.participants[0]?.isOnline || false;
  }

  trackByChat(index: number, item: MinimizedChatDisplay): string {
    return item.chatId;
  }
}
