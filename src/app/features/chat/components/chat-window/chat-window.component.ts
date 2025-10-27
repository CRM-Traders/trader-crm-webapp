import {
  Component,
  Input,
  OnInit,
  OnDestroy,
  inject,
  ViewChild,
  ElementRef,
  AfterViewChecked,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, debounceTime } from 'rxjs';
import { ChatService } from '../../services/chat.service';
import { ChatStateService } from '../../services/chat-state.service';
import { Chat, Message, MessageType } from '../../models/chat.model';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-chat-window',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-window.component.html',
  styleUrl: './chat-window.component.scss',
})
export class ChatWindowComponent
  implements OnInit, OnDestroy, AfterViewChecked
{
  @Input() chatId!: string;
  @Input() position: number = 0;

  @ViewChild('messagesContainer') messagesContainer!: ElementRef;
  @ViewChild('messageInput') messageInput!: ElementRef;

  private chatService = inject(ChatService);
  public chatStateService = inject(ChatStateService);
  private authService = inject(AuthService);

  chat: Chat | undefined;
  messages: Message[] = [];
  messageContent = '';
  isMinimized = false;
  isLoading = false;
  typingUsers: string[] = [];

  private currentUserId: string = '';
  private destroy$ = new Subject<void>();
  private typingSubject$ = new Subject<boolean>();
  private shouldScrollToBottom = true;
  private isTyping = false;

  MessageType = MessageType;

  ngOnInit(): void {
    this.currentUserId = this.authService.getUserId() || '';

    // Load chat data
    this.loadChat();
    this.loadMessages();

    // Subscribe to new messages
    this.chatService
      .getMessages(this.chatId)
      .pipe(takeUntil(this.destroy$))
      .subscribe((messages) => {
        this.messages = messages;
        this.shouldScrollToBottom = true;
      });

    // Subscribe to chat updates
    this.chatService
      .getChatById(this.chatId)
      .pipe(takeUntil(this.destroy$))
      .subscribe((chat) => {
        this.chat = chat;
      });

    // Subscribe to typing indicators
    this.chatService
      .getTypingUsers(this.chatId)
      .pipe(takeUntil(this.destroy$))
      .subscribe((users) => {
        this.typingUsers = users.filter(
          (userId) => userId !== this.currentUserId
        );
      });

    // Subscribe to minimize state
    this.chatStateService.state
      .pipe(takeUntil(this.destroy$))
      .subscribe((state) => {
        const window = state.openWindows.find((w) => w.chatId === this.chatId);
        this.isMinimized = window?.isMinimized || false;
      });

    // Setup typing indicator debounce
    this.typingSubject$
      .pipe(debounceTime(1000), takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.isTyping) {
          this.chatService.notifyTyping(this.chatId, false);
          this.isTyping = false;
        }
      });
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  ngOnDestroy(): void {
    // Notify stop typing on destroy
    if (this.isTyping) {
      this.chatService.notifyTyping(this.chatId, false);
    }

    // Leave chat room
    this.chatService.leaveChat(this.chatId);

    this.destroy$.next();
    this.destroy$.complete();
  }

  async loadChat(): Promise<void> {
    try {
      // First try to get from local state
      const chat = await this.chatService
        .getChatById(this.chatId)
        .pipe(takeUntil(this.destroy$))
        .toPromise();

      if (chat) {
        this.chat = chat;
      } else {
        // If not in local state, fetch from API
        const apiChat = await this.chatService.loadChatById(this.chatId);
        this.chat = apiChat;
      }
    } catch (error) {
      console.error('Error loading chat:', error);
      // Close this window if we can't load the chat
      this.close();
    }
  }

  getChatName(): string {
    return this.chat?.name || 'Loading...';
  }

  getChatAvatar(): string {
    const name = this.getChatName();
    if (name === 'Loading...') return '?';
    return name
      .split(' ')
      .map((n) => n.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }

  async loadMessages(): Promise<void> {
    this.isLoading = true;
    try {
      await this.chatService.loadMessages(this.chatId);
    } finally {
      this.isLoading = false;
    }
  }

  async sendMessage(): Promise<void> {
    const content = this.messageContent.trim();
    if (!content) return;

    try {
      await this.chatService.sendMessage(
        this.chatId,
        content,
        MessageType.Text
      );
      this.messageContent = '';

      // Stop typing indicator
      if (this.isTyping) {
        this.chatService.notifyTyping(this.chatId, false);
        this.isTyping = false;
      }

      this.shouldScrollToBottom = true;
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }

  onMessageInput(): void {
    if (!this.isTyping) {
      this.chatService.notifyTyping(this.chatId, true);
      this.isTyping = true;
    }
    this.typingSubject$.next(true);
  }

  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  minimize(): void {
    this.chatStateService.minimizeWindow(this.chatId);
  }

  close(): void {
    this.chatStateService.closeChatWindow(this.chatId);
  }

  isOwnMessage(message: Message): boolean {
    return message.senderId === this.currentUserId;
  }

  getMessageTime(message: Message): string {
    try {
      // Ensure createdAt is a Date object
      const date =
        message.createdAt instanceof Date
          ? message.createdAt
          : new Date(message.createdAt);

      // Check if date is valid
      if (isNaN(date.getTime())) {
        return 'Invalid time';
      }

      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch (error) {
      console.error('Error formatting message time:', error, message);
      return 'Invalid time';
    }
  }

  getMessageDate(message: Message): string {
    try {
      // Ensure createdAt is a Date object
      const date =
        message.createdAt instanceof Date
          ? message.createdAt
          : new Date(message.createdAt);

      // Check if date is valid
      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }

      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      if (date.toDateString() === today.toDateString()) {
        return 'Today';
      } else if (date.toDateString() === yesterday.toDateString()) {
        return 'Yesterday';
      } else {
        return date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year:
            date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
        });
      }
    } catch (error) {
      console.error('Error formatting message date:', error, message);
      return 'Invalid date';
    }
  }

  shouldShowDateSeparator(message: Message, index: number): boolean {
    if (index === 0) return true;

    try {
      const currentDate =
        message.createdAt instanceof Date
          ? message.createdAt
          : new Date(message.createdAt);

      const previousDate =
        this.messages[index - 1].createdAt instanceof Date
          ? this.messages[index - 1].createdAt
          : new Date(this.messages[index - 1].createdAt);

      // Check if dates are valid
      if (isNaN(currentDate.getTime()) || isNaN(previousDate.getTime())) {
        return false;
      }

      return currentDate.toDateString() !== previousDate.toDateString();
    } catch (error) {
      console.error('Error checking date separator:', error);
      return false;
    }
  }

  getOnlineStatus(): boolean {
    return this.chat?.participants[0]?.isOnline || false;
  }

  getPositionStyle(): string {
    const rightOffset = 20 + this.position * 390;
    return `${rightOffset}px`;
  }

  getPositionOffset(): number {
    // 20px base offset + (position × 340px for each window)
    // 320px width + 20px gap between windows
    return 20 + this.position * 390;
  }

  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.uploadFile(file);
    }
  }

  async uploadFile(file: File): Promise<void> {
    try {
      await this.chatService.sendFileMessage(this.chatId, file);
      this.shouldScrollToBottom = true;
    } catch (error) {
      console.error('Error uploading file:', error);
    }
  }

  onPaste(event: ClipboardEvent): void {
    const items = event.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile();
        if (blob) {
          this.uploadFile(blob);
        }
      }
    }
  }

  private scrollToBottom(): void {
    try {
      if (this.messagesContainer) {
        this.messagesContainer.nativeElement.scrollTop =
          this.messagesContainer.nativeElement.scrollHeight;
      }
    } catch (err) {
      console.error('Error scrolling to bottom:', err);
    }
  }

  focusInput(): void {
    setTimeout(() => {
      this.messageInput?.nativeElement?.focus();
    }, 100);
  }
}
