import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';

export type ChatChannel = 'clients' | 'operators';

export interface ChatUser {
  id: string;
  name: string;
  email: string;
  username?: string;
  isOnline: boolean;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
  channel: ChatChannel;
  avatar?: string;
}

export interface ChatMessage {
  id: string;
  text: string;
  timestamp: Date;
  isSender: boolean;
  userId: string;
  attachments?: string[];
}

export interface ChatWindow {
  id: string;
  user: ChatUser;
  isMinimized: boolean;
  position?: { x: number; y: number };
}

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  private unreadCountSubject = new BehaviorSubject<number>(0);
  public unreadCount$ = this.unreadCountSubject.asObservable();

  private openChatsSubject = new BehaviorSubject<ChatWindow[]>([]);
  public openChats$ = this.openChatsSubject.asObservable();

  constructor() {
    // Initialize with mock data
    this.updateUnreadCount();
  }

  getChatUsers(channel: ChatChannel): Observable<ChatUser[]> {
    // Mock data - replace with actual API call
    const mockUsers: ChatUser[] = [
      {
        id: '1',
        name: 'John Doe',
        email: 'john.doe@example.com',
        username: 'johndoe',
        isOnline: true,
        lastMessage: 'Thanks for the update!',
        lastMessageTime: new Date(Date.now() - 300000),
        unreadCount: 2,
        channel: 'clients',
      },
      {
        id: '2',
        name: 'Jane Smith',
        email: 'jane.smith@example.com',
        username: 'janesmith',
        isOnline: false,
        lastMessage: 'Can we schedule a call?',
        lastMessageTime: new Date(Date.now() - 3600000),
        unreadCount: 0,
        channel: 'clients',
      },
      {
        id: '3',
        name: 'Mike Johnson',
        email: 'mike.j@company.com',
        username: 'mikej',
        isOnline: true,
        lastMessage: 'Issue resolved',
        lastMessageTime: new Date(Date.now() - 7200000),
        unreadCount: 1,
        channel: 'operators',
      },
    ];

    return of(mockUsers.filter((u) => u.channel === channel));
  }

  openChatWindow(chatData: any) {
    const currentChats = this.openChatsSubject.value;

    // Check if chat is already open
    if (currentChats.find((c) => c.user.id === chatData.user?.id)) {
      return;
    }

    const newChat: ChatWindow = {
      id: Date.now().toString(),
      user: chatData.user,
      isMinimized: false,
    };

    this.openChatsSubject.next([...currentChats, newChat]);
  }

  closeChatWindow(chatId: string) {
    const currentChats = this.openChatsSubject.value;
    this.openChatsSubject.next(currentChats.filter((c) => c.id !== chatId));
  }

  private updateUnreadCount() {
    // Calculate total unread count
    this.getChatUsers('clients').subscribe((clients) => {
      this.getChatUsers('operators').subscribe((operators) => {
        const total = [...clients, ...operators].reduce(
          (sum, user) => sum + user.unreadCount,
          0
        );
        this.unreadCountSubject.next(total);
      });
    });
  }

  searchUsers(query: string, channel?: ChatChannel): Observable<ChatUser[]> {
    // Implement search logic
    return this.getChatUsers(channel || 'clients');
  }

  markAsRead(userId: string) {
    // Mark messages as read
    this.updateUnreadCount();
  }

  sendMessage(chatId: string, message: string) {
    // Send message to backend
    console.log('Sending message:', message);
  }
}
