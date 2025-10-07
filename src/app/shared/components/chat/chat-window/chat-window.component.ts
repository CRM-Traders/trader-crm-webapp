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
import { ChatUser, ChatMessage, MessageStatus } from '../../../services/chat/chat.service';

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

      @keyframes pulse {
        0%, 100% {
          opacity: 1;
        }
        50% {
          opacity: 0.5;
        }
      }

      .status-sending {
        animation: pulse 1.5s ease-in-out infinite;
      }

      .status-sent {
        transition: all 0.3s ease;
      }

      .status-delivered {
        transition: all 0.3s ease;
      }

      .status-seen {
        transition: all 0.3s ease;
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
    // Mark messages as seen when chat window is opened
    this.markMessagesAsSeen();
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
        status: MessageStatus.SEEN,
      },
      {
        id: '2',
        text: 'I have a question about my order',
        timestamp: new Date(Date.now() - 3000000),
        isSender: true,
        userId: 'current-user',
        status: MessageStatus.SEEN,
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
      status: MessageStatus.SENDING,
    };

    this.messages.push(message);
    this.newMessage = '';
    this.adjustTextareaHeight(); // Reset textarea height
    this.scrollToBottom();

    // Simulate message status updates
    this.simulateMessageStatusUpdates(message.id);

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
        const responseMessage: ChatMessage = {
          id: Date.now().toString(),
          text: "Thanks for your message! I'll look into that for you.",
          timestamp: new Date(),
          isSender: false,
          userId: this.user?.id || 'unknown',
          status: MessageStatus.SEEN,
        };
        this.messages.push(responseMessage);
        this.scrollToBottom();
      }, 2000);
    }, 500);
  }

  simulateMessageStatusUpdates(messageId: string) {
    // Simulate SENT status after 500ms
    setTimeout(() => {
      this.updateMessageStatus(messageId, MessageStatus.SENT);
    }, 500);

    // Simulate DELIVERED status after 1.5s
    setTimeout(() => {
      this.updateMessageStatus(messageId, MessageStatus.DELIVERED);
    }, 1500);

    // Simulate SEEN status after 3s
    setTimeout(() => {
      this.updateMessageStatus(messageId, MessageStatus.SEEN);
    }, 3000);
  }

  updateMessageStatus(messageId: string, status: MessageStatus) {
    const message = this.messages.find(m => m.id === messageId);
    if (message) {
      message.status = status;
    }
  }

  markMessagesAsSeen() {
    // Mark all received messages as seen
    this.messages.forEach(message => {
      if (!message.isSender && message.status !== MessageStatus.SEEN) {
        message.status = MessageStatus.SEEN;
      }
    });
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

  getStatusIcon(status: MessageStatus): string {
    switch (status) {
      case MessageStatus.SENDING:
        return 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z';
      case MessageStatus.SENT:
        return 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z';
      case MessageStatus.DELIVERED:
        return 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z';
      case MessageStatus.SEEN:
        return 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z';
      default:
        return 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z';
    }
  }

  getStatusColor(status: MessageStatus): string {
    switch (status) {
      case MessageStatus.SENDING:
        return 'text-gray-300';
      case MessageStatus.SENT:
        return 'text-white';
      case MessageStatus.DELIVERED:
        return 'text-green-300';
      case MessageStatus.SEEN:
        return 'text-green-400';
      default:
        return 'text-gray-300';
    }
  }

  getStatusAnimationClass(status: MessageStatus): string {
    switch (status) {
      case MessageStatus.SENDING:
        return 'status-sending';
      case MessageStatus.SENT:
        return 'status-sent';
      case MessageStatus.DELIVERED:
        return 'status-delivered';
      case MessageStatus.SEEN:
        return 'status-seen';
      default:
        return '';
    }
  }

  getStatusTitle(status: MessageStatus): string {
    switch (status) {
      case MessageStatus.SENDING:
        return 'Sending...';
      case MessageStatus.SENT:
        return 'Sent';
      case MessageStatus.DELIVERED:
        return 'Delivered';
      case MessageStatus.SEEN:
        return 'Seen';
      default:
        return 'Unknown';
    }
  }
}
