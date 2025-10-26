import { Injectable, inject } from '@angular/core';
import {
  Chat,
  ChatApiResponse,
  Participant,
  ParticipantApiResponse,
  ChatType,
} from '../models/chat.model';
import { AuthService } from '../../../core/services/auth.service';

@Injectable({
  providedIn: 'root',
})
export class ChatTransformerService {
  private authService = inject(AuthService);

  transformChatFromApi(apiChat: ChatApiResponse): Chat {
    const currentUserId = this.authService.getUserId();

    return {
      id: apiChat.id,
      type: apiChat.chatType,
      name: this.getChatName(apiChat, currentUserId),
      lastMessage: undefined,
      unreadCount: 0,
      participants: apiChat.participants.map((p) =>
        this.transformParticipant(p)
      ),
      isOnline: false,
      updatedAt: new Date(apiChat.createdAt),
      createdAt: new Date(apiChat.createdAt),
    };
  }

  transformChatsFromApi(apiChats: ChatApiResponse[]): Chat[] {
    return apiChats.map((chat) => this.transformChatFromApi(chat));
  }

  private transformParticipant(
    apiParticipant: ParticipantApiResponse
  ): Participant {
    return {
      id: apiParticipant.id,
      userId: apiParticipant.userId,
      name: apiParticipant.name || 'Unknown User', // Fallback for null/empty names
      isOnline: false,
      userType: apiParticipant.userType,
      avatar: undefined,
    };
  }

  private getChatName(
    apiChat: ChatApiResponse,
    currentUserId: string | null
  ): string {
    // For group chats, use groupName
    if (apiChat.chatType === ChatType.OperatorGroup) {
      return apiChat.groupName || 'Group Chat'; // Fallback for empty group names
    }

    // For 1-on-1 chats, use the other participant's name
    const otherParticipant = apiChat.participants.find(
      (p) => p.userId !== currentUserId
    );

    if (otherParticipant) {
      // Use participant name, with fallback
      return otherParticipant.name || 'Unknown User';
    }

    // Last resort fallback
    return 'Chat';
  }
}
