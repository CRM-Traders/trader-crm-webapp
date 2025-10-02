import { Component, EventEmitter, Output, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import {
  ChatChannel,
  ChatService,
  ChatUser,
} from '../../../services/chat/chat.service';

@Component({
  selector: 'app-chat-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div
      class="w-96 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700"
    >
      <!-- Header with Tabs -->
      <div class="p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3">
          Messages
        </h3>

        <!-- Channel Tabs -->
        <div class="flex space-x-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
          <button
            (click)="setActiveChannel('clients')"
            [class.bg-white]="activeChannel === 'clients'"
            [class.dark:bg-gray-600]="activeChannel === 'clients'"
            [class.text-blue-600]="activeChannel === 'clients'"
            [class.dark:text-blue-400]="activeChannel === 'clients'"
            class="flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors relative"
          >
            Clients
            <span
              *ngIf="clientsUnreadCount > 0"
              class="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full h-4.5 w-4.5 flex items-center justify-center"
            >
              {{ clientsUnreadCount }}
            </span>
          </button>
          <button
            (click)="setActiveChannel('operators')"
            [class.bg-white]="activeChannel === 'operators'"
            [class.dark:bg-gray-600]="activeChannel === 'operators'"
            [class.text-blue-600]="activeChannel === 'operators'"
            [class.dark:text-blue-400]="activeChannel === 'operators'"
            class="flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors relative"
          >
            Operators
            <span
              *ngIf="operatorsUnreadCount > 0"
              class="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full h-4.5 w-4.5 flex items-center justify-center"
            >
              {{ operatorsUnreadCount }}
            </span>
          </button>
        </div>

        <!-- Search Bar -->
        <div class="mt-3 relative">
          <input
            type="text"
            [(ngModel)]="searchQuery"
            (ngModelChange)="onSearchChange($event)"
            placeholder="Search by email or username..."
            class="w-full px-3 py-2 !pl-10 border border-gray-300/20 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <svg
            class="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>

      <!-- Chat List -->
      <div class="max-h-96 overflow-y-auto">
        <div
          *ngIf="filteredUsers.length === 0"
          class="p-4 text-center text-gray-500 dark:text-gray-400"
        >
          {{ searchQuery ? 'No users found' : 'No conversations yet' }}
        </div>

        <div
          *ngFor="let user of filteredUsers"
          (click)="selectUser(user)"
          class="flex items-center p-3 hover:bg-gray-500/20 cursor-pointer border-b border-gray-300/20 last:border-b-0"
        >
          <!-- Avatar -->
          <div class="relative">
            <div
              class="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold"
              [style.background-color]="getAvatarColor(user.name)"
            >
              {{ getInitials(user.name) }}
            </div>
           
            <!-- Unread Badge -->
            <span
              *ngIf="user.unreadCount > 0"
              class="absolute -top-[3px] -right-[2px] bg-green-600 text-white text-[10px] font-bold rounded-full w-4.5 h-4.5 flex items-center justify-center shadow-sm shadow-white"
            >
              {{ user.unreadCount }}
            </span>
          </div>

          <!-- User Info -->
          <div class="ml-3 flex-1">
            <div class="flex items-center justify-between">
              <p class="text-sm font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-1">
                {{ user.name }}
                <span
              *ngIf="user.isOnline"
              class="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"
            ></span>
              </p>
              <span class="text-xs text-gray-500 dark:text-gray-400">
                {{ formatTime(user.lastMessageTime) }}
              </span>
            </div>
            <p class="text-xs text-gray-500 dark:text-gray-400">
              {{ user.email }}
            </p>
            <p class="text-sm text-gray-600 dark:text-gray-300 truncate mt-1">
              {{ user.lastMessage }}
            </p>
          </div>
        </div>
      </div>
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
export class ChatListComponent implements OnInit {
  @Output() close = new EventEmitter<void>();
  @Output() openChat = new EventEmitter<any>();

  private chatService = inject(ChatService);
  private searchSubject = new Subject<string>();

  activeChannel: ChatChannel = 'clients';
  searchQuery = '';
  users: ChatUser[] = [];
  filteredUsers: ChatUser[] = [];
  clientsUnreadCount = 0;
  operatorsUnreadCount = 0;

  ngOnInit() {
    // Initialize with last active channel
    this.activeChannel = this.chatService.getLastActiveChannel();
    this.loadUsers();

    this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe((query) => {
        this.filterUsers(query);
      });
  }

  loadUsers() {
    this.chatService.getChatUsers(this.activeChannel).subscribe((users) => {
      this.users = users;
      this.filterUsers(this.searchQuery);
      this.updateUnreadCounts();
    });
  }

  setActiveChannel(channel: ChatChannel) {
    this.activeChannel = channel;
    this.chatService.setActiveChannel(channel);
    this.loadUsers();
  }

  onSearchChange(query: string) {
    this.searchSubject.next(query);
  }

  filterUsers(query: string) {
    if (!query.trim()) {
      this.filteredUsers = this.users;
    } else {
      const lowerQuery = query.toLowerCase();
      this.filteredUsers = this.users.filter(
        (user) =>
          user.name.toLowerCase().includes(lowerQuery) ||
          user.email.toLowerCase().includes(lowerQuery) ||
          user.username?.toLowerCase().includes(lowerQuery)
      );
    }
  }

  selectUser(user: ChatUser) {
    this.openChat.emit({
      user,
      channel: this.activeChannel,
    });
  }

  startNewChat() {
    this.openChat.emit({
      isNew: true,
      channel: this.activeChannel,
    });
  }

  updateUnreadCounts() {
    this.clientsUnreadCount = this.users
      .filter((u) => u.channel === 'clients')
      .reduce((sum, u) => sum + u.unreadCount, 0);

    this.operatorsUnreadCount = this.users
      .filter((u) => u.channel === 'operators')
      .reduce((sum, u) => sum + u.unreadCount, 0);
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  getAvatarColor(name: string): string {
    const colors = [
      '#3B82F6',
      '#10B981',
      '#F59E0B',
      '#EF4444',
      '#8B5CF6',
      '#EC4899',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }

  formatTime(date: Date | string): string {
    const messageDate = new Date(date);
    const now = new Date();
    const diff = now.getTime() - messageDate.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return messageDate.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return messageDate.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return messageDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    }
  }
}
