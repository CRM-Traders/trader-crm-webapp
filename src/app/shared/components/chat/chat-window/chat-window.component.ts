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
  templateUrl: './chat-window.component.html',
  styles: [
    `
      :host {
        display: block;
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
  @Input() index: number = 0;
  @Input() minimizedCount: number = 0;
  @Input() set initialMinimized(value: boolean) {
    this.isMinimized = value;
  }
  @Output() closeChat = new EventEmitter<void>();
  @Output() minimizeChange = new EventEmitter<boolean>();

  @ViewChild('messagesContainer') messagesContainer!: ElementRef;
  @ViewChild('messageInput') messageInput!: ElementRef;

  messages: ChatMessage[] = [];
  newMessage = '';
  isTyping = false;
  isMinimized = false;

  ngOnInit() {
    this.loadMessages();
    if (!this.isMinimized) {
      this.scrollToBottom();
    }
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
    this.adjustTextareaHeight(); // Reset textarea height
    this.scrollToBottom();

    // Simulate typing indicator
    this.simulateTyping();
  }

  onEnterKey(event: Event) {
    const keyboardEvent = event as KeyboardEvent;
    if (keyboardEvent.key === 'Enter' && !keyboardEvent.shiftKey) {
      keyboardEvent.preventDefault();
      this.sendMessage();
    }
  }

  adjustTextareaHeight() {
    if (this.messageInput) {
      const textarea = this.messageInput.nativeElement;
      textarea.style.height = 'auto';
      const scrollHeight = textarea.scrollHeight;
      const maxHeight = 128; // 32 * 4 = 128px (max-h-32)
      textarea.style.height = Math.min(scrollHeight, maxHeight) + 'px';
    }
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
    this.minimizeChange.emit(this.isMinimized);
  }

  getPosition(): string {
    // Open chats: position them to the left of minimized circles
    // If there are minimized chats, add offset for their space (48px width + 16px padding)
    const minimizedOffset = this.minimizedCount > 0 ? 64 : 0;
    return `${16 + minimizedOffset + this.index * 420}px`;
  }

  getMinimizedPosition(): string {
    // Minimized chats: 56px spacing (48px height + 8px gap), stacked vertically from bottom
    return `${16 + this.index * 56}px`;
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
