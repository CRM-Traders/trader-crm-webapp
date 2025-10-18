import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatWindowComponent } from '../chat-window/chat-window.component';
import { ChatWindow } from '../../../models/chat/chat.model';
import { ChatService } from '../../../services/chat/chat.service';

@Component({
  selector: 'app-chat-container',
  standalone: true,
  imports: [CommonModule, ChatWindowComponent],
  template: `
    <div class="fixed bottom-0 right-0 !z-[9999]">
      <app-chat-window
        *ngFor="let chat of openChats; let i = index"
        [user]="chat.user"
        [chatId]="chat.id"
        [index]="getChatIndex(chat)"
        [minimizedCount]="getMinimizedCount()"
        [initialMinimized]="chat.isMinimized"
        (closeChat)="closeChat(chat.id)"
        (minimizeChange)="onMinimizeChange(chat.id, $event)"
      ></app-chat-window>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
})
export class ChatContainerComponent implements OnInit {
  private chatService = inject(ChatService);
  openChats: ChatWindow[] = [];

  ngOnInit() {
    this.chatService.openChats$.subscribe((chats) => {
      this.openChats = chats;
    });
  }

  closeChat(chatId: string) {
    this.chatService.closeChatWindow(chatId);
  }

  onMinimizeChange(chatId: string, isMinimized: boolean) {
    this.chatService.updateChatMinimizedState(chatId, isMinimized);
  }

  getMinimizedCount(): number {
    return this.openChats.filter((chat) => chat.isMinimized).length;
  }

  getChatIndex(chat: ChatWindow): number {
    if (chat.isMinimized) {
      // Index among minimized chats only
      return this.openChats
        .filter((c) => c.isMinimized)
        .findIndex((c) => c.id === chat.id);
    } else {
      // Index among open chats only
      return this.openChats
        .filter((c) => !c.isMinimized)
        .findIndex((c) => c.id === chat.id);
    }
  }
}
