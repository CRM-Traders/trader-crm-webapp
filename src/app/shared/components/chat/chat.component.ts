import {
  Component,
  inject,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  AfterViewChecked,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  Subject,
  combineLatest,
  debounceTime,
  distinctUntilChanged,
  takeUntil,
  map,
} from 'rxjs';
import {
  ChatUser,
  ChatConversation,
  ChatMessage,
} from '../../models/chat/chat.model';
import { ChatService } from '../../services/chat/chat.service';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.scss',
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  private chatService = inject(ChatService);
  private changeDetector = inject(ChangeDetectorRef);

  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;
  @ViewChild('messageInput') private messageInput!: ElementRef;

  private destroy$ = new Subject<void>();
  private typingSubject = new Subject<boolean>();
  private searchSubject = new Subject<string>();
  private shouldScrollToBottom = true;

  // Component state properties
  isOpen = false;
  unreadCount = 0;
  users: ChatUser[] = [];
  filteredUsers: ChatUser[] = [];
  conversations: ChatConversation[] = [];
  currentMessages: ChatMessage[] = [];
  activeConversationId: string | null = null;
  activeConversationDetails: ChatConversation | null = null;
  loading = false;

  messageText = '';
  searchQuery = '';
  showUserList = true;
  isTyping = false;

  ngOnInit(): void {
    this.initializeSubscriptions();
    this.setupTypingIndicator();
    this.setupSearch();
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeSubscriptions(): void {
    // Subscribe to isOpen state
    this.chatService.isOpen$
      .pipe(takeUntil(this.destroy$))
      .subscribe((isOpen) => {
        this.isOpen = isOpen;
        this.changeDetector.markForCheck();
      });

    // Subscribe to unread count
    this.chatService.unreadCount$
      .pipe(takeUntil(this.destroy$))
      .subscribe((count) => {
        this.unreadCount = count;
        this.changeDetector.markForCheck();
      });

    // Subscribe to users
    this.chatService.users$
      .pipe(takeUntil(this.destroy$))
      .subscribe((users) => {
        this.users = users;
        this.filterUsers(this.searchQuery);
        this.changeDetector.markForCheck();
      });

    // Subscribe to conversations
    this.chatService.conversations$
      .pipe(takeUntil(this.destroy$))
      .subscribe((conversations) => {
        this.conversations = conversations;
        this.updateActiveConversationDetails();
        this.changeDetector.markForCheck();
      });

    // Subscribe to current messages
    this.chatService.currentMessages$
      .pipe(takeUntil(this.destroy$))
      .subscribe((messages) => {
        this.currentMessages = messages;
        this.shouldScrollToBottom = true;
        this.changeDetector.markForCheck();
      });

    // Subscribe to active conversation
    this.chatService.activeConversation$
      .pipe(takeUntil(this.destroy$))
      .subscribe((conversationId) => {
        this.activeConversationId = conversationId;
        this.updateActiveConversationDetails();

        if (conversationId) {
          this.shouldScrollToBottom = true;
          setTimeout(() => {
            this.messageInput?.nativeElement?.focus();
          }, 100);
        }

        this.changeDetector.markForCheck();
      });

    // Subscribe to loading state
    this.chatService.loading$
      .pipe(takeUntil(this.destroy$))
      .subscribe((loading) => {
        this.loading = loading;
        this.changeDetector.markForCheck();
      });
  }

  private setupTypingIndicator(): void {
    this.typingSubject
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((isTyping) => {
        if (this.activeConversationId) {
          this.chatService.sendTypingIndicator(
            this.activeConversationId,
            isTyping
          );
        }
      });
  }

  private setupSearch(): void {
    this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((query) => {
        this.filterUsers(query);
      });
  }

  private filterUsers(query: string): void {
    if (!query) {
      this.filteredUsers = this.users;
    } else {
      this.filteredUsers = this.users.filter((user) =>
        user.username.toLowerCase().includes(query.toLowerCase())
      );
    }
    this.changeDetector.markForCheck();
  }

  private updateActiveConversationDetails(): void {
    if (!this.activeConversationId) {
      this.activeConversationDetails = null;
      return;
    }

    this.activeConversationDetails =
      this.conversations.find((c) => c.id === this.activeConversationId) ||
      null;
  }

  toggleChat(): void {
    this.chatService.toggleChat();
  }

  closeChat(): void {
    this.chatService.closeChat();
  }

  selectUser(user: ChatUser): void {
    this.chatService
      .createOrGetConversation(user.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.showUserList = false;
        this.changeDetector.markForCheck();
      });
  }

  selectConversation(conversation: ChatConversation): void {
    this.chatService.setActiveConversation(conversation.id);
    this.showUserList = false;
    this.changeDetector.markForCheck();
  }

  backToList(): void {
    this.showUserList = true;
    this.chatService.setActiveConversation(null);
    this.changeDetector.markForCheck();
  }

  sendMessage(): void {
    if (!this.messageText.trim() || !this.activeConversationId) return;

    this.chatService
      .sendMessage(this.activeConversationId, this.messageText.trim())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.messageText = '';
          this.shouldScrollToBottom = true;
          this.typingSubject.next(false);
          this.changeDetector.markForCheck();
        },
        error: (error) => {
          console.error('Failed to send message:', error);
        },
      });
  }

  onMessageInput(): void {
    this.typingSubject.next(this.messageText.length > 0);
  }

  onSearchInput(event: Event): void {}

  formatMessageTime(date: Date): string {
    const messageDate = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - messageDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    return messageDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year:
        messageDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  }

  formatLastSeen(date: Date | undefined): string {
    if (!date) return 'Unknown';

    const lastSeenDate = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - lastSeenDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hours ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays} days ago`;

    return lastSeenDate.toLocaleDateString();
  }

  getUserStatusColor(status: 'online' | 'offline' | 'away'): string {
    switch (status) {
      case 'online':
        return 'bg-green-500';
      case 'away':
        return 'bg-yellow-500';
      case 'offline':
        return 'bg-gray-400';
      default:
        return 'bg-gray-400';
    }
  }

  getConversationName(conversation: ChatConversation): string {
    if (conversation.participants.length === 2) {
      const otherUser = conversation.participants.find(
        (p) => p.id !== this.getCurrentUserId()
      );
      return otherUser?.username || 'Unknown User';
    }
    return 'Group Chat';
  }

  getCurrentUserId(): string {
    // This should ideally come from your auth service
    // You may want to add a method in AuthService to get current user ID
    return 'current-user-id';
  }

  isMessageFromCurrentUser(message: ChatMessage): boolean {
    return message.senderId === this.getCurrentUserId();
  }

  trackByUserId(index: number, user: ChatUser): string {
    return user.id;
  }

  trackByConversationId(index: number, conversation: ChatConversation): string {
    return conversation.id;
  }

  trackByMessageId(index: number, message: ChatMessage): string {
    return message.id;
  }

  private scrollToBottom(): void {
    try {
      if (this.messagesContainer?.nativeElement) {
        this.messagesContainer.nativeElement.scrollTop =
          this.messagesContainer.nativeElement.scrollHeight;
      }
    } catch (err) {
      console.error('Could not scroll to bottom:', err);
    }
  }
}
