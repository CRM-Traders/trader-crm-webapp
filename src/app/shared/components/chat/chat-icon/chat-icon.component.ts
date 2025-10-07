import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { ChatListComponent } from '../chat-list/chat-list.component';
import { ChatService } from '../../../services/chat/chat.service';

@Component({
  selector: 'app-chat-icon',
  standalone: true,
  imports: [CommonModule, ChatListComponent],
  template: `
    <div class="relative">
      <!-- Chat Icon Button -->
      <button
        (click)="toggleChatList($event)"
        class="relative p-2 rounded-full hover:bg-gray-500/20 transition-colors"
        title="Messages"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-6 w-6 text-gray-600 dark:text-gray-300"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>

        <!-- Unread Count Badge -->
        <span
          *ngIf="totalUnreadCount > 0"
          class="absolute -top-[2px] -right-1 bg-red-500 text-white text-[9px] rounded-full h-4.5 w-4.5 flex items-center justify-center"
        >
          {{ totalUnreadCount > 99 ? '99+' : totalUnreadCount }}
        </span>
      </button>

      <!-- Chat List Dropdown -->
      <app-chat-list
        *ngIf="showChatList"
        (close)="closeChatList()"
        (openChat)="handleOpenChat($event)"
        class="absolute right-0 top-12 z-[99999]"
      ></app-chat-list>
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
export class ChatIconComponent implements OnInit, OnDestroy {
  private chatService = inject(ChatService);
  private destroy$ = new Subject<void>();

  showChatList = false;
  totalUnreadCount = 0;

  ngOnInit() {
    this.chatService.unreadCount$
      .pipe(takeUntil(this.destroy$))
      .subscribe((count) => {
        this.totalUnreadCount = count;
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleChatList(event: Event) {
    event.stopPropagation();
    this.showChatList = !this.showChatList;

    if (this.showChatList) {
      setTimeout(() => {
        document.addEventListener('click', this.handleOutsideClick);
      });
    }
  }

  closeChatList() {
    this.showChatList = false;
    document.removeEventListener('click', this.handleOutsideClick);
  }

  handleOpenChat(chatData: any) {
    this.chatService.openChatWindow(chatData);
    this.closeChatList();
  }

  private handleOutsideClick = (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    if (!target.closest('app-chat-list') && !target.closest('button')) {
      this.closeChatList();
    }
  };
}
