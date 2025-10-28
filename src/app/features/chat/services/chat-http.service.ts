import { Injectable, inject } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { HttpService } from '../../../core/services/http.service';
import {
  Chat,
  Message,
  ChatType,
  MessageType,
  ChatApiResponse,
} from '../models/chat.model';

export interface CreateClientToOperatorChatRequest {
  initialMessage: string;
}

export interface CreateOperatorToOperatorChatRequest {
  targetOperatorId: string;
}

export interface CreateOperatorGroupChatRequest {
  groupName: string;
  operatorIds: string[];
}

export interface SendMessageRequest {
  chatId: string;
  content: string;
  messageType: MessageType;
  fileUrl?: string;
  fileName?: string;
}

export interface EditMessageRequest {
  content: string;
}

export interface AddParticipantsRequest {
  operatorIds: string[];
}

export interface ChatMessagesResponse {
  messages: Message[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface FileUploadResponse {
  fileUrl: string;
  fileName: string;
  fileSize: number;
  contentType: string;
}

@Injectable({
  providedIn: 'root',
})
export class ChatHttpService {
  private http = inject(HttpService);
  private readonly baseEndpoint = 'chats/api/chats';

  // Chat operations
  getUserChats(): Observable<ChatApiResponse[]> {
    return this.http.get<ChatApiResponse[]>(this.baseEndpoint);
  }

  getChatById(chatId: string): Observable<ChatApiResponse> {
    return this.http.get<ChatApiResponse>(`${this.baseEndpoint}/${chatId}`);
  }

  // Create client to operator chat (by client)
  createClientToOperatorChat(initialMessage: string): Observable<Chat> {
    const request: CreateClientToOperatorChatRequest = {
      initialMessage,
    };
    return this.http.post<Chat>(
      `${this.baseEndpoint}/client-to-operator`,
      request
    );
  }

  // Create client to operator chat (by operator)
  createClientToOperatorChatByOperator(
    clientId: string,
    initialMessage: string
  ): Observable<Chat> {
    const request: CreateClientToOperatorChatRequest = {
      initialMessage,
    };
    return this.http.post<Chat>(
      `${this.baseEndpoint}/client-to-operator-by-op/${clientId}`,
      request
    );
  }

  // Create operator to operator chat
  createOperatorToOperatorChat(targetOperatorId: string): Observable<Chat> {
    const request: CreateOperatorToOperatorChatRequest = {
      targetOperatorId,
    };
    return this.http.post<Chat>(
      `${this.baseEndpoint}/operator-to-operator`,
      request
    );
  }

  // Create operator group chat
  createOperatorGroupChat(
    groupName: string,
    operatorIds: string[]
  ): Observable<Chat> {
    const request: CreateOperatorGroupChatRequest = {
      groupName,
      operatorIds,
    };
    return this.http.post<Chat>(`${this.baseEndpoint}/operator-group`, request);
  }

  // Message operations
  getChatMessages(
    chatId: string,
    pageNumber: number = 1,
    pageSize: number = 50
  ): Observable<ChatMessagesResponse> {
    const params = new HttpParams()
      .set('pageNumber', pageNumber.toString())
      .set('pageSize', pageSize.toString());

    return this.http.get<ChatMessagesResponse>(
      `${this.baseEndpoint}/${chatId}/messages`,
      params
    );
  }

  sendMessage(request: SendMessageRequest): Observable<Message> {
    return this.http.post<Message>(`${this.baseEndpoint}/messages`, request);
  }

  editMessage(
    messageId: string,
    request: EditMessageRequest
  ): Observable<Message> {
    return this.http.put<Message>(
      `${this.baseEndpoint}/messages/${messageId}`,
      request
    );
  }

  deleteMessage(messageId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseEndpoint}/messages/${messageId}`);
  }

  // Mark chat as read
  markChatAsRead(chatId: string): Observable<void> {
    return this.http.post<void>(`${this.baseEndpoint}/${chatId}/read`, {});
  }

  // Group chat operations
  addParticipants(chatId: string, operatorIds: string[]): Observable<void> {
    const request: AddParticipantsRequest = {
      operatorIds,
    };
    return this.http.post<void>(
      `${this.baseEndpoint}/${chatId}/participants`,
      request
    );
  }

  // File upload (if you have this endpoint, update the path)
  uploadFile(file: File, chatId: string): Observable<FileUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('chatId', chatId);

    // Update this endpoint when you add file upload to your backend
    return this.http.postForm<FileUploadResponse>(
      `${this.baseEndpoint}/upload`,
      formData
    );
  }

  // Unread count (you may need to add this endpoint to your backend)
  getUnreadCount(): Observable<{ totalUnreadCount: number }> {
    // This endpoint doesn't exist in your API yet
    // You'll need to add it or calculate client-side
    return this.http.get<{ totalUnreadCount: number }>(
      `${this.baseEndpoint}/unread-count`
    );
  }
}
