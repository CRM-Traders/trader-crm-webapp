import { Component, Input, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import { ChatService } from '../../services/chat.service';
import { ChatStateService } from '../../services/chat-state.service';
import { Chat, ChatSection, ChatType } from '../../models/chat.model';

@Component({
  selector: 'app-chat-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-list.component.html',
  styleUrl: './chat-list.component.scss',
})
export class ChatListComponent implements OnInit, OnDestroy {
  @Input() section: ChatSection = ChatSection.Client;

  private chatService = inject(ChatService);
  private chatStateService = inject(ChatStateService);

  chats: Chat[] = [];
  filteredChats: Chat[] = [];
  searchQuery = '';
  isLoading = false;

  // Expose ChatType for template
  ChatType = ChatType;

  private destroy$ = new Subject<void>();
  private searchSubject$ = new Subject<string>();

  ngOnInit(): void {
    // Subscribe to chats
    this.chatService.chats.pipe(takeUntil(this.destroy$)).subscribe((chats) => {
      this.chats = this.filterChatsBySection(chats);
      this.applySearchFilter();
    });

    // Subscribe to loading state
    this.chatService.isLoading
      .pipe(takeUntil(this.destroy$))
      .subscribe((loading) => {
        this.isLoading = loading;
      });

    // Setup search with debounce
    this.searchSubject$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((query) => {
        this.applySearchFilter();
      });

    this.loadChats();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSearchChange(query: string): void {
    this.searchQuery = query;
    this.searchSubject$.next(query);
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.applySearchFilter();
  }

  openChat(chat: Chat): void {
    this.chatStateService.openChatWindow(chat.id);
  }

  private loadChats(): void {
    this.chatService.loadChats(this.section);
  }

  private filterChatsBySection(allChats: Chat[]): Chat[] {
    if (this.section === ChatSection.Client) {
      // Show only ClientToOperator chats
      return allChats.filter((chat) => chat.type === ChatType.ClientToOperator);
    } else if (this.section === ChatSection.Operator) {
      // Show both OperatorToOperator AND OperatorGroup chats
      return allChats.filter(
        (chat) =>
          chat.type === ChatType.OperatorToOperator ||
          chat.type === ChatType.OperatorGroup
      );
    }
    return [];
  }

  private applySearchFilter(): void {
    if (!this.searchQuery.trim()) {
      this.filteredChats = [...this.chats];
      return;
    }

    const query = this.searchQuery.toLowerCase();
    this.filteredChats = this.chats.filter(
      (chat) =>
        chat.name.toLowerCase().includes(query) ||
        (chat.lastMessage?.content || '').toLowerCase().includes(query)
    );
  }

  getLastMessagePreview(chat: Chat): string {
    if (!chat.lastMessage) {
      return 'No messages yet';
    }

    const content = chat.lastMessage.content || '';
    return content.length > 50 ? content.substring(0, 50) + '...' : content;
  }

  getLastMessageTime(chat: Chat): string {
    if (!chat.lastMessage) {
      return '';
    }

    try {
      const messageDate =
        chat.lastMessage.createdAt instanceof Date
          ? chat.lastMessage.createdAt
          : new Date(chat.lastMessage.createdAt);

      // Check if date is valid
      if (isNaN(messageDate.getTime())) {
        return '';
      }

      const now = new Date();
      const diffMs = now.getTime() - messageDate.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) {
        return 'Just now';
      } else if (diffMins < 60) {
        return `${diffMins}m ago`;
      } else if (diffHours < 24) {
        return `${diffHours}h ago`;
      } else if (diffDays < 7) {
        return `${diffDays}d ago`;
      } else {
        return messageDate.toLocaleDateString();
      }
    } catch (error) {
      console.error('Error formatting last message time:', error);
      return '';
    }
  }

  getOnlineStatusColor(chat: Chat): string {
    // For 1-on-1 chats, check if the other participant is online
    if (chat.type !== ChatType.OperatorGroup && chat.participants.length > 0) {
      const otherParticipant = chat.participants[0];
      return otherParticipant?.isOnline ? 'bg-green-500' : 'bg-gray-400';
    }
    return 'bg-gray-400';
  }

  isParticipantOnline(chat: Chat): boolean {
    if (chat.type !== ChatType.OperatorGroup && chat.participants.length > 0) {
      return chat.participants[0]?.isOnline || false;
    }
    return false;
  }

  getChatAvatar(chat: Chat): string {
    // Return first letter of chat name, or '?' if name is empty
    const name = chat.name || 'Unknown';
    return name.charAt(0).toUpperCase();
  }

  // NEW: Check if chat is a group chat
  isGroupChat(chat: Chat): boolean {
    return chat.type === ChatType.OperatorGroup;
  }

  trackByChat(index: number, chat: Chat): string {
    return chat.id;
  }
}
