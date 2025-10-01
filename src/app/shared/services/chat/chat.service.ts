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
      // Clients with recent activity
      {
        id: '1',
        name: 'John Doe',
        email: 'john.doe@example.com',
        username: 'johndoe',
        isOnline: true,
        lastMessage: 'Thanks for the update!',
        lastMessageTime: new Date(Date.now() - 300000), // 5 min ago
        unreadCount: 2,
        channel: 'clients',
        avatar: 'https://i.pravatar.cc/150?img=1'
      },
      {
        id: '2',
        name: 'Jane Smith',
        email: 'jane.smith@example.com',
        username: 'janesmith',
        isOnline: false,
        lastMessage: 'Can we schedule a call?',
        lastMessageTime: new Date(Date.now() - 3600000), // 1 hour ago
        unreadCount: 0,
        channel: 'clients',
        avatar: 'https://i.pravatar.cc/150?img=5'
      },
      {
        id: '3',
        name: 'Robert Wilson',
        email: 'r.wilson@email.com',
        username: 'rwilson',
        isOnline: true,
        lastMessage: 'When can I expect the withdrawal?',
        lastMessageTime: new Date(Date.now() - 180000), // 3 min ago
        unreadCount: 5,
        channel: 'clients',
        avatar: 'https://i.pravatar.cc/150?img=12'
      },
      {
        id: '4',
        name: 'Emily Brown',
        email: 'emily.brown@mail.com',
        username: 'emilybrown',
        isOnline: true,
        lastMessage: 'Perfect! Thank you so much 😊',
        lastMessageTime: new Date(Date.now() - 600000), // 10 min ago
        unreadCount: 0,
        channel: 'clients',
        avatar: 'https://i.pravatar.cc/150?img=9'
      },
      {
        id: '5',
        name: 'Michael Davis',
        email: 'm.davis@example.com',
        isOnline: false,
        lastMessage: 'I need help with my account verification',
        lastMessageTime: new Date(Date.now() - 7200000), // 2 hours ago
        unreadCount: 3,
        channel: 'clients',
        avatar: 'https://i.pravatar.cc/150?img=13'
      },
      {
        id: '6',
        name: 'Sarah Martinez',
        email: 'sarah.m@company.com',
        username: 'sarahm',
        isOnline: true,
        lastMessage: 'The platform is working great now!',
        lastMessageTime: new Date(Date.now() - 1800000), // 30 min ago
        unreadCount: 1,
        channel: 'clients',
        avatar: 'https://i.pravatar.cc/150?img=10'
      },
      {
        id: '7',
        name: 'David Lee',
        email: 'david.lee@test.com',
        username: 'davidlee',
        isOnline: false,
        lastMessage: 'Can you check my trading history?',
        lastMessageTime: new Date(Date.now() - 14400000), // 4 hours ago
        unreadCount: 0,
        channel: 'clients',
        avatar: 'https://i.pravatar.cc/150?img=14'
      },
      {
        id: '8',
        name: 'Lisa Anderson',
        email: 'l.anderson@mail.com',
        username: 'lisaa',
        isOnline: true,
        lastMessage: 'I have a question about leverage',
        lastMessageTime: new Date(Date.now() - 900000), // 15 min ago
        unreadCount: 7,
        channel: 'clients',
        avatar: 'https://i.pravatar.cc/150?img=20'
      },
      {
        id: '9',
        name: 'James Taylor',
        email: 'james.t@example.com',
        isOnline: false,
        lastMessage: 'Thank you for your help!',
        lastMessageTime: new Date(Date.now() - 86400000), // 1 day ago
        unreadCount: 0,
        channel: 'clients',
        avatar: 'https://i.pravatar.cc/150?img=15'
      },
      {
        id: '10',
        name: 'Anna White',
        email: 'anna.white@email.com',
        username: 'annawhite',
        isOnline: true,
        lastMessage: 'Is the bonus already credited?',
        lastMessageTime: new Date(Date.now() - 120000), // 2 min ago
        unreadCount: 4,
        channel: 'clients',
        avatar: 'https://i.pravatar.cc/150?img=16'
      },
      {
        id: '11',
        name: 'Christopher Harris',
        email: 'c.harris@test.com',
        username: 'chrisharris',
        isOnline: false,
        lastMessage: 'I want to close my position',
        lastMessageTime: new Date(Date.now() - 10800000), // 3 hours ago
        unreadCount: 2,
        channel: 'clients',
        avatar: 'https://i.pravatar.cc/150?img=17'
      },
      {
        id: '12',
        name: 'Jessica Thompson',
        email: 'jessica.thompson@mail.com',
        isOnline: true,
        lastMessage: 'Great service, very satisfied!',
        lastMessageTime: new Date(Date.now() - 2700000), // 45 min ago
        unreadCount: 0,
        channel: 'clients',
        avatar: 'https://i.pravatar.cc/150?img=23'
      },
      {
        id: '13',
        name: 'Daniel Garcia',
        email: 'd.garcia@example.com',
        username: 'dangarcia',
        isOnline: true,
        lastMessage: 'Can I increase my deposit limit?',
        lastMessageTime: new Date(Date.now() - 60000), // 1 min ago
        unreadCount: 6,
        channel: 'clients',
        avatar: 'https://i.pravatar.cc/150?img=18'
      },
      {
        id: '14',
        name: 'Olivia Moore',
        email: 'olivia.m@company.com',
        isOnline: false,
        lastMessage: 'I received the payment, thanks!',
        lastMessageTime: new Date(Date.now() - 172800000), // 2 days ago
        unreadCount: 0,
        channel: 'clients',
        avatar: 'https://i.pravatar.cc/150?img=24'
      },
      {
        id: '15',
        name: 'Matthew Clark',
        email: 'matthew.clark@test.com',
        username: 'mattclark',
        isOnline: true,
        lastMessage: 'What are the trading hours?',
        lastMessageTime: new Date(Date.now() - 5400000), // 90 min ago
        unreadCount: 1,
        channel: 'clients',
        avatar: 'https://i.pravatar.cc/150?img=19'
      },

      // Operators with various statuses
      {
        id: '101',
        name: 'Mike Johnson',
        email: 'mike.j@company.com',
        username: 'mikej',
        isOnline: true,
        lastMessage: 'Issue resolved',
        lastMessageTime: new Date(Date.now() - 7200000), // 2 hours ago
        unreadCount: 1,
        channel: 'operators',
        avatar: 'https://i.pravatar.cc/150?img=33'
      },
      {
        id: '102',
        name: 'Amanda Stevens',
        email: 'amanda.s@company.com',
        username: 'amandas',
        isOnline: true,
        lastMessage: 'Just finished the client call',
        lastMessageTime: new Date(Date.now() - 420000), // 7 min ago
        unreadCount: 3,
        channel: 'operators',
        avatar: 'https://i.pravatar.cc/150?img=31'
      },
      {
        id: '103',
        name: 'Kevin Rodriguez',
        email: 'k.rodriguez@company.com',
        username: 'kevinr',
        isOnline: false,
        lastMessage: 'On lunch break, back at 2pm',
        lastMessageTime: new Date(Date.now() - 1800000), // 30 min ago
        unreadCount: 0,
        channel: 'operators',
        avatar: 'https://i.pravatar.cc/150?img=32'
      },
      {
        id: '104',
        name: 'Rachel Kim',
        email: 'rachel.kim@company.com',
        username: 'rachelk',
        isOnline: true,
        lastMessage: 'Need help with this withdrawal request',
        lastMessageTime: new Date(Date.now() - 240000), // 4 min ago
        unreadCount: 5,
        channel: 'operators',
        avatar: 'https://i.pravatar.cc/150?img=44'
      },
      {
        id: '105',
        name: 'Thomas Wright',
        email: 't.wright@company.com',
        username: 'thomasw',
        isOnline: true,
        lastMessage: 'All tickets cleared for today!',
        lastMessageTime: new Date(Date.now() - 3600000), // 1 hour ago
        unreadCount: 0,
        channel: 'operators',
        avatar: 'https://i.pravatar.cc/150?img=51'
      },
      {
        id: '106',
        name: 'Sophie Turner',
        email: 'sophie.t@company.com',
        username: 'sophiet',
        isOnline: true,
        lastMessage: 'Can someone review this KYC document?',
        lastMessageTime: new Date(Date.now() - 840000), // 14 min ago
        unreadCount: 2,
        channel: 'operators',
        avatar: 'https://i.pravatar.cc/150?img=47'
      },
      {
        id: '107',
        name: 'Alex Cooper',
        email: 'alex.c@company.com',
        username: 'alexc',
        isOnline: false,
        lastMessage: 'System maintenance completed',
        lastMessageTime: new Date(Date.now() - 10800000), // 3 hours ago
        unreadCount: 0,
        channel: 'operators',
        avatar: 'https://i.pravatar.cc/150?img=52'
      },
      {
        id: '108',
        name: 'Maria Gonzalez',
        email: 'm.gonzalez@company.com',
        username: 'mariag',
        isOnline: true,
        lastMessage: 'Client requesting bonus information',
        lastMessageTime: new Date(Date.now() - 180000), // 3 min ago
        unreadCount: 4,
        channel: 'operators',
        avatar: 'https://i.pravatar.cc/150?img=48'
      },
      {
        id: '109',
        name: 'Ryan Mitchell',
        email: 'ryan.m@company.com',
        username: 'ryanm',
        isOnline: true,
        lastMessage: 'Updated the trading rules document',
        lastMessageTime: new Date(Date.now() - 5400000), // 90 min ago
        unreadCount: 0,
        channel: 'operators',
        avatar: 'https://i.pravatar.cc/150?img=53'
      },
      {
        id: '110',
        name: 'Emma Watson',
        email: 'emma.w@company.com',
        username: 'emmaw',
        isOnline: false,
        lastMessage: 'Working from home today',
        lastMessageTime: new Date(Date.now() - 28800000), // 8 hours ago
        unreadCount: 1,
        channel: 'operators',
        avatar: 'https://i.pravatar.cc/150?img=45'
      },
      {
        id: '111',
        name: 'Brian Foster',
        email: 'brian.f@company.com',
        username: 'brianf',
        isOnline: true,
        lastMessage: 'Meeting starts in 10 minutes',
        lastMessageTime: new Date(Date.now() - 600000), // 10 min ago
        unreadCount: 8,
        channel: 'operators',
        avatar: 'https://i.pravatar.cc/150?img=54'
      },
      {
        id: '112',
        name: 'Nicole Palmer',
        email: 'nicole.p@company.com',
        username: 'nicolep',
        isOnline: true,
        lastMessage: 'Great work on the new feature!',
        lastMessageTime: new Date(Date.now() - 1200000), // 20 min ago
        unreadCount: 0,
        channel: 'operators',
        avatar: 'https://i.pravatar.cc/150?img=49'
      }
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

  updateChatMinimizedState(chatId: string, isMinimized: boolean) {
    const currentChats = this.openChatsSubject.value;
    const updatedChats = currentChats.map((chat) =>
      chat.id === chatId ? { ...chat, isMinimized } : chat
    );
    this.openChatsSubject.next(updatedChats);
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
