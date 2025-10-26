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

  private destroy$ = new Subject<void>();
  private searchSubject$ = new Subject<string>();

  ngOnInit(): void {
    // Subscribe to chats
    this.chatService.chats.pipe(takeUntil(this.destroy$)).subscribe((chats) => {
      console.log('Chat list received chats:', chats); // Debug log
      this.chats = this.filterChatsBySection(chats);
      console.log('Filtered chats for section:', this.chats); // Debug log
      this.applySearchFilter();
    });

    // Subscribe to loading state
    this.chatService.isLoading
      .pipe(takeUntil(this.destroy$))
      .subscribe((loading) => {
        console.log('Loading state:', loading); // Debug log
        this.isLoading = loading;
      });

    // Setup search with debounce
    this.searchSubject$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((query) => {
        this.applySearchFilter();
      });

    // Load initial chats
    console.log('Loading chats for section:', this.section); // Debug log
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
    const chatType = this.sectionToChatType(this.section);
    return allChats.filter((chat) => chat.type === chatType);
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
        chat.lastMessage?.content.toLowerCase().includes(query)
    );
  }

  private sectionToChatType(section: ChatSection): ChatType {
    switch (section) {
      case ChatSection.Client:
        return ChatType.ClientToOperator;
      case ChatSection.Operator:
        return ChatType.OperatorToOperator;
      case ChatSection.Group:
        return ChatType.OperatorGroup;
      default:
        return ChatType.ClientToOperator;
    }
  }

  getLastMessagePreview(chat: Chat): string {
    if (!chat.lastMessage) {
      return 'No messages yet';
    }

    const content = chat.lastMessage.content;
    return content.length > 50 ? content.substring(0, 50) + '...' : content;
  }

  getLastMessageTime(chat: Chat): string {
    if (!chat.lastMessage) {
      return '';
    }

    const messageDate = new Date(chat.lastMessage.createdAt);
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
    // Return first letter of chat name
    return chat.name.charAt(0).toUpperCase();
  }

  trackByChat(index: number, chat: Chat): string {
    return chat.id;
  }
}
