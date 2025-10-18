import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';

import {
  ChatUser,
  ChatMessage,
  MessageStatus,
  MessageDto,
  PagedResult,
} from '../../../models/chat/chat.model';
import { ChatService } from '../../../services/chat/chat.service';
import { SignalRService } from '../../../services/chat/signalr.service';

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
        0%,
        100% {
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
export class ChatWindowComponent implements OnInit, OnDestroy {
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

  private chatService = inject(ChatService);
  private signalRService = inject(SignalRService);
  private destroy$ = new Subject<void>();
  private typingSubject = new Subject<string>();

  messages: ChatMessage[] = [];
  newMessage = '';
  isTyping = false;
  isMinimized = false;
  isLoading = false;
  hasMoreMessages = true;
  currentPage = 1;
  typingUsers: Map<string, boolean> = new Map();
  private typingTimer: any;
  private isCurrentlyTyping = false;

  ngOnInit() {
    this.loadChatDetails();
    this.setupTypingDetection();
    this.setupSignalRListeners();
    if (!this.isMinimized) {
      this.scrollToBottom();
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.typingTimer) {
      clearTimeout(this.typingTimer);
    }
  }

  private loadChatDetails() {
    this.isLoading = true;
    this.chatService
      .getChatDetails(this.chatId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (details) => {
          this.mapMessagesToChat(details.messages);
          this.isLoading = false;
          this.scrollToBottom();
          this.markMessagesAsSeen();
        },
        error: (error) => {
          console.error('Error loading chat details:', error);
          this.isLoading = false;
        },
      });
  }

  private mapMessagesToChat(messages: any[]) {
    const currentUserId = this.getCurrentUserId();
    this.messages = messages.map((msg) => ({
      id: msg.id,
      text: msg.content,
      timestamp: new Date(msg.createdAt),
      isSender: msg.senderId === currentUserId,
      userId: msg.senderId,
      status: msg.isRead ? MessageStatus.SEEN : MessageStatus.DELIVERED,
      attachments: msg.fileId ? [msg.fileId] : undefined,
    }));
  }

  private setupTypingDetection() {
    this.typingSubject
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((text) => {
        if (text && !this.isCurrentlyTyping) {
          this.isCurrentlyTyping = true;
          this.chatService.sendTypingIndicator(this.chatId, true).subscribe();
        }

        if (this.typingTimer) {
          clearTimeout(this.typingTimer);
        }

        this.typingTimer = setTimeout(() => {
          if (this.isCurrentlyTyping) {
            this.isCurrentlyTyping = false;
            this.chatService
              .sendTypingIndicator(this.chatId, false)
              .subscribe();
          }
        }, 3000);
      });
  }

  private setupSignalRListeners() {
    this.signalRService.messageReceived$
      .pipe(takeUntil(this.destroy$))
      .subscribe((message: any) => {
        if (message && message.chatId === this.chatId) {
          this.handleIncomingMessage(message);
        }
      });

    this.signalRService.typingIndicator$
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        if (
          data &&
          data.chatId === this.chatId &&
          data.userId !== this.getCurrentUserId()
        ) {
          this.typingUsers.set(data.userId, data.isTyping);
          this.isTyping = Array.from(this.typingUsers.values()).some(
            (typing) => typing
          );
        }
      });

    this.signalRService.messageRead$
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        if (data) {
          const message = this.messages.find((m) => m.id === data.messageId);
          if (message) {
            message.status = MessageStatus.SEEN;
          }
        }
      });

    this.signalRService.messageEdited$
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        if (data) {
          const message = this.messages.find((m) => m.id === data.messageId);
          if (message) {
            message.text = data.newContent;
          }
        }
      });

    this.signalRService.messageDeleted$
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        if (data && data.chatId === this.chatId) {
          this.messages = this.messages.filter((m) => m.id !== data.messageId);
        }
      });
  }

  private handleIncomingMessage(messageDto: MessageDto) {
    const currentUserId = this.getCurrentUserId();
    const message: ChatMessage = {
      id: messageDto.id,
      text: messageDto.content,
      timestamp: new Date(messageDto.createdAt),
      isSender: messageDto.senderId === currentUserId,
      userId: messageDto.senderId,
      status: MessageStatus.DELIVERED,
      attachments: messageDto.fileId ? [messageDto.fileId] : undefined,
    };

    this.messages.push(message);
    this.scrollToBottom();

    if (!message.isSender) {
      this.chatService.markMessageAsRead(message.id).subscribe();
    }
  }

  sendMessage() {
    if (!this.newMessage.trim()) return;

    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: ChatMessage = {
      id: tempId,
      text: this.newMessage,
      timestamp: new Date(),
      isSender: true,
      userId: this.getCurrentUserId(),
      status: MessageStatus.SENDING,
    };

    this.messages.push(optimisticMessage);
    const messageText = this.newMessage;
    this.newMessage = '';
    this.adjustTextareaHeight();
    this.scrollToBottom();

    this.chatService
      .sendMessage(this.chatId, messageText)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (messageId) => {
          const index = this.messages.findIndex((m) => m.id === tempId);
          if (index !== -1) {
            this.messages[index].id = messageId;
            this.messages[index].status = MessageStatus.SENT;
          }
          this.simulateMessageStatusUpdates(messageId);
        },
        error: (error) => {
          const index = this.messages.findIndex((m) => m.id === tempId);
          if (index !== -1) {
            this.messages[index].status = MessageStatus.SENT;
          }
          console.error('Failed to send message:', error);
        },
      });
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
      const maxHeight = 128;
      textarea.style.height = Math.min(scrollHeight, maxHeight) + 'px';
    }
  }

  onMessageInput() {
    this.typingSubject.next(this.newMessage);
    this.adjustTextareaHeight();
  }

  loadMoreMessages() {
    if (!this.hasMoreMessages || this.isLoading) return;

    this.isLoading = true;
    this.currentPage++;

    this.chatService
      .getChatMessages(this.chatId, this.currentPage)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result: PagedResult<MessageDto>) => {
          const currentUserId = this.getCurrentUserId();
          const olderMessages = result.items.map((msg: any) => ({
            id: msg.id,
            text: msg.content,
            timestamp: new Date(msg.createdAt),
            isSender: msg.senderId === currentUserId,
            userId: msg.senderId,
            status: msg.isRead ? MessageStatus.SEEN : MessageStatus.DELIVERED,
            attachments: msg.fileId ? [msg.fileId] : undefined,
          }));

          this.messages.unshift(...olderMessages.reverse());
          this.hasMoreMessages = result.hasNextPage;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading more messages:', error);
          this.isLoading = false;
        },
      });
  }

  private simulateMessageStatusUpdates(messageId: string) {
    setTimeout(() => {
      this.updateMessageStatus(messageId, MessageStatus.DELIVERED);
    }, 1500);

    setTimeout(() => {
      this.updateMessageStatus(messageId, MessageStatus.SEEN);
    }, 3000);
  }

  private updateMessageStatus(messageId: string, status: MessageStatus) {
    const message = this.messages.find((m) => m.id === messageId);
    if (message) {
      message.status = status;
    }
  }

  private markMessagesAsSeen() {
    this.messages.forEach((message) => {
      if (!message.isSender && message.status !== MessageStatus.SEEN) {
        message.status = MessageStatus.SEEN;
        this.chatService.markMessageAsRead(message.id).subscribe();
      }
    });
  }

  toggleMinimize() {
    this.isMinimized = !this.isMinimized;
    this.minimizeChange.emit(this.isMinimized);
  }

  getPosition(): string {
    const minimizedOffset = this.minimizedCount > 0 ? 64 : 0;
    return `${16 + minimizedOffset + this.index * 420}px`;
  }

  getMinimizedPosition(): string {
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

  private getCurrentUserId(): string {
    const userData = sessionStorage.getItem('user_data');
    return userData ? JSON.parse(userData).id : '';
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
