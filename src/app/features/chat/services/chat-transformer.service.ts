import { Injectable, inject } from '@angular/core';
import {
  Chat,
  ChatApiResponse,
  Participant,
  ParticipantApiResponse,
  ChatType,
} from '../models/chat.model';
import { forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { IdentityService } from './identity.service';
import { AuthService } from '../../../core/services/auth.service';

@Injectable({
  providedIn: 'root',
})
export class ChatTransformerService {
  private identityService = inject(IdentityService);
  private participantNameCache = new Map<string, string>();
  private authService = inject(AuthService);

  transformChatFromApi(apiChat: ChatApiResponse): Chat {
    return {
      id: apiChat.id,
      type: apiChat.chatType,
      name: this.getChatName(apiChat),
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
      name: apiParticipant.name,
      isOnline: false,
      userType: apiParticipant.userType,
      avatar: undefined,
    };
  }

  private getChatName(apiChat: ChatApiResponse): string {
    // For group chats, use groupName
    if (apiChat.chatType === ChatType.OperatorGroup && apiChat.groupName) {
      return apiChat.groupName;
    }

    // For 1-on-1 chats, return a temporary name that will be updated
    return apiChat.participants.filter(
      (x) => x.userId !== this.authService.getUserId()
    )[0].name;
  }

  async enrichChatWithParticipantNames(chat: Chat): Promise<Chat> {
    // Get all participant user IDs that we don't have names for
    const unknownParticipants = chat.participants.filter(
      (p) =>
        !this.participantNameCache.has(p.userId) ||
        this.participantNameCache.get(p.userId) === 'Loading...'
    );

    if (unknownParticipants.length === 0) {
      return chat;
    }

    try {
      // Fetch participant details
      const participantDetails = await Promise.all(
        unknownParticipants.map(async (p) => {
          try {
            if (p.userType === 1) {
              // Client
              const response = await this.identityService
                .searchClients(null, 1, 100)
                .toPromise();
              const client = response?.items.find((c) => c.userId === p.userId);
              return {
                userId: p.userId,
                name: client?.fullName || 'Unknown Client',
              };
            } else {
              // Operator
              const response = await this.identityService
                .searchOperators(null, 1, 100)
                .toPromise();
              const operator = response?.items.find(
                (o) => o.userId === p.userId
              );
              return {
                userId: p.userId,
                name: operator?.value || 'Unknown Operator',
              };
            }
          } catch (error) {
            console.error(`Error fetching name for user ${p.userId}:`, error);
            return { userId: p.userId, name: 'Unknown User' };
          }
        })
      );

      // Update cache
      participantDetails.forEach((detail) => {
        this.participantNameCache.set(detail.userId, detail.name);
      });

      // Update participants with real names
      chat.participants = chat.participants.map((p) => ({
        ...p,
        name: this.participantNameCache.get(p.userId) || p.name,
      }));

      // Update chat name for 1-on-1 chats
      if (chat.type !== ChatType.OperatorGroup) {
        const otherParticipant = chat.participants[0];
        if (otherParticipant) {
          chat.name = otherParticipant.name;
        }
      }

      return chat;
    } catch (error) {
      console.error('Error enriching chat with participant names:', error);
      return chat;
    }
  }

  clearCache(): void {
    this.participantNameCache.clear();
  }
}
