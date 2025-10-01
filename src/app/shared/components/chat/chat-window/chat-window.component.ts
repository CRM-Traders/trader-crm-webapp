import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { ChatUser, ChatMessage } from '../../../services/chat/chat.service';

@Component({
  selector: 'app-chat-window',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule],
  template: `
    <div
      cdkDrag
      cdkDragBoundary="body"
      [cdkDragStartDelay]="100"
      class="fixed bottom-4 right-4 w-96 h-[500px] bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col z-[9999]"
      [class.minimized]="isMinimized"
    >
      <!-- Drag Handle & Header -->
      <div
        cdkDragHandle
        class="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-3 rounded-t-lg cursor-move flex items-center justify-between"
      >
        <div class="flex items-center">
          <div
            class="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-semibold mr-3"
          >
            {{ getInitials(user.name || 'Unknown') }}
          </div>
          <div>
            <p class="font-semibold">{{ user.name || 'Unknown User' }}</p>
            <p class="text-xs opacity-90">
              {{ user.isOnline ? 'Active now' : 'Offline' }}
            </p>
          </div>
        </div>

        <div class="flex items-center space-x-2">
          <button
            (click)="toggleMinimize()"
            class="p-1 hover:bg-white/20 rounded transition-colors"
            title="Minimize"
          >
            <svg
              class="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M20 12H4"
              ></path>
            </svg>
          </button>
          <button
            (click)="closeChat.emit()"
            class="p-1 hover:bg-white/20 rounded transition-colors"
            title="Close"
          >
            <svg
              class="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              ></path>
            </svg>
          </button>
        </div>
      </div>

      <!-- Chat Messages -->
      <div
        #messagesContainer
        *ngIf="!isMinimized"
        class="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 dark:bg-gray-900"
      >
        <div
          *ngFor="let message of messages"
          [class.justify-end]="message.isSender"
          class="flex"
        >
          <div
            [class.bg-blue-500]="message.isSender"
            [class.text-white]="message.isSender"
            [class.bg-white]="!message.isSender"
            [class.dark:bg-gray-700]="!message.isSender"
            [class.text-gray-800]="!message.isSender"
            [class.dark:text-gray-200]="!message.isSender"
            class="max-w-[70%] rounded-lg px-4 py-2 shadow"
          >
            <p class="text-sm">{{ message.text }}</p>
            <p
              [class.text-blue-100]="message.isSender"
              [class.text-gray-500]="!message.isSender"
              [class.dark:text-gray-400]="!message.isSender"
              class="text-xs mt-1"
            >
              {{ formatTime(message.timestamp) }}
            </p>
          </div>
        </div>

        <!-- Typing Indicator -->
        <div *ngIf="isTyping" class="flex">
          <div class="bg-white dark:bg-gray-700 rounded-lg px-4 py-2 shadow">
            <div class="flex space-x-1">
              <span
                class="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                style="animation-delay: 0ms"
              ></span>
              <span
                class="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                style="animation-delay: 150ms"
              ></span>
              <span
                class="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                style="animation-delay: 300ms"
              ></span>
            </div>
          </div>
        </div>
      </div>

      <!-- Input Area -->
      <div
        *ngIf="!isMinimized"
        class="p-3 border-t border-gray-200 dark:border-gray-700"
      >
        <div class="flex items-end space-x-2">
          <button
            class="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            title="Attach file"
          >
            <svg
              class="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
              ></path>
            </svg>
          </button>

          <input
            #messageInput
            [(ngModel)]="newMessage"
            (keyup.enter)="sendMessage()"
            placeholder="Type a message..."
            class="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <button
            (click)="sendMessage()"
            [disabled]="!newMessage.trim()"
            class="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg
              class="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              ></path>
            </svg>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .minimized {
        height: auto !important;
      }

      @keyframes bounce {
        0%,
        100% {
          transform: translateY(0);
        }
        50% {
          transform: translateY(-4px);
        }
      }
    `,
  ],
})
export class ChatWindowComponent implements OnInit {
  @Input() user!: ChatUser;
  @Input() chatId!: string;
  @Output() closeChat = new EventEmitter<void>();

  @ViewChild('messagesContainer') messagesContainer!: ElementRef;
  @ViewChild('messageInput') messageInput!: ElementRef;

  messages: ChatMessage[] = [];
  newMessage = '';
  isTyping = false;
  isMinimized = false;

  ngOnInit() {
    this.loadMessages();
    this.scrollToBottom();
  }

  loadMessages() {
    // Load messages from service
    this.messages = [
      {
        id: '1',
        text: 'Hello! How can I help you today?',
        timestamp: new Date(Date.now() - 3600000),
        isSender: false,
        userId: this.user?.id || 'unknown',
      },
      {
        id: '2',
        text: 'I have a question about my order',
        timestamp: new Date(Date.now() - 3000000),
        isSender: true,
        userId: 'current-user',
      },
    ];
  }

  sendMessage() {
    if (!this.newMessage.trim()) return;

    const message: ChatMessage = {
      id: Date.now().toString(),
      text: this.newMessage,
      timestamp: new Date(),
      isSender: true,
      userId: 'current-user',
    };

    this.messages.push(message);
    this.newMessage = '';
    this.scrollToBottom();

    // Simulate typing indicator
    this.simulateTyping();
  }

  simulateTyping() {
    setTimeout(() => {
      this.isTyping = true;
      setTimeout(() => {
        this.isTyping = false;
        this.messages.push({
          id: Date.now().toString(),
          text: "Thanks for your message! I'll look into that for you.",
          timestamp: new Date(),
          isSender: false,
          userId: this.user?.id || 'unknown',
        });
        this.scrollToBottom();
      }, 2000);
    }, 500);
  }

  toggleMinimize() {
    this.isMinimized = !this.isMinimized;
  }

  scrollToBottom() {
    setTimeout(() => {
      if (this.messagesContainer) {
        this.messagesContainer.nativeElement.scrollTop =
          this.messagesContainer.nativeElement.scrollHeight;
      }
    });
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  formatTime(date: Date): string {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
