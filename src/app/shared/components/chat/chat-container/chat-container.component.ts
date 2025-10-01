import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatWindowComponent } from '../chat-window/chat-window.component';
import {
  ChatService,
  ChatWindow,
  ChatUser,
} from '../../../services/chat/chat.service';

@Component({
  selector: 'app-chat-container',
  standalone: true,
  imports: [CommonModule, ChatWindowComponent],
  template: `
    <div class="fixed bottom-0 right-0 z-[9999]">
      <app-chat-window
        *ngFor="let chat of openChats; let i = index"
        [user]="chat.user"
        [chatId]="chat.id"
        (closeChat)="closeChat(chat.id)"
        [style.right.px]="20 + i * 420"
        [style.bottom.px]="20"
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
}
