// src/app/shared/services/chat/chat-api.service.ts

import { inject, Injectable } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { HttpService } from '../../../core/services/http.service';
import {
  ChatSummaryDto,
  ChatDetailsDto,
  CreateChatCommand,
  MessageDto,
  ParticipantDto,
  PagedResult,
  SendMessageRequest,
  SendMessageWithFileRequest,
  EditMessageRequest,
  CloseChatRequest,
  TransferChatRequest,
  TypingIndicatorRequest,
  AddParticipantRequest,
  SetStatusRequest,
  ChatSearchParams,
} from '../../models/chat/chat-system.model';

@Injectable({
  providedIn: 'root',
})
export class ChatApiService {
  private httpService = inject(HttpService);
  private readonly baseUrl = 'chats/api';

  createChat(command: CreateChatCommand): Observable<string> {
    return this.httpService.post<string>(`${this.baseUrl}/chats`, command);
  }

  getChatDetails(chatId: string): Observable<ChatDetailsDto> {
    return this.httpService.get<ChatDetailsDto>(
      `${this.baseUrl}/chats/${chatId}`
    );
  }

  getMyChats(
    pageIndex: number = 1,
    pageSize: number = 20
  ): Observable<ChatSummaryDto[]> {
    const params = new HttpParams()
      .set('pageIndex', pageIndex.toString())
      .set('pageSize', pageSize.toString());

    return this.httpService.get<ChatSummaryDto[]>(
      `${this.baseUrl}/chats/my-chats`,
      params
    );
  }

  searchChats(
    searchParams: ChatSearchParams
  ): Observable<PagedResult<ChatSummaryDto>> {
    let params = new HttpParams();

    if (searchParams.searchTerm)
      params = params.set('searchTerm', searchParams.searchTerm);
    if (searchParams.type) params = params.set('type', searchParams.type);
    if (searchParams.status) params = params.set('status', searchParams.status);
    if (searchParams.operatorId)
      params = params.set('operatorId', searchParams.operatorId);
    if (searchParams.startDate)
      params = params.set('startDate', searchParams.startDate.toISOString());
    if (searchParams.endDate)
      params = params.set('endDate', searchParams.endDate.toISOString());
    if (searchParams.pageIndex)
      params = params.set('pageIndex', searchParams.pageIndex.toString());
    if (searchParams.pageSize)
      params = params.set('pageSize', searchParams.pageSize.toString());

    return this.httpService.get<PagedResult<ChatSummaryDto>>(
      `${this.baseUrl}/chats/search`,
      params
    );
  }

  closeChat(chatId: string, request: CloseChatRequest): Observable<void> {
    return this.httpService.post<void>(
      `${this.baseUrl}/chats/${chatId}/close`,
      request
    );
  }

  transferChat(chatId: string, request: TransferChatRequest): Observable<void> {
    return this.httpService.post<void>(
      `${this.baseUrl}/chats/${chatId}/transfer`,
      request
    );
  }

  sendTypingIndicator(
    chatId: string,
    request: TypingIndicatorRequest
  ): Observable<void> {
    return this.httpService.post<void>(
      `${this.baseUrl}/chats/${chatId}/typing`,
      request
    );
  }

  getChatParticipants(chatId: string): Observable<ParticipantDto[]> {
    return this.httpService.get<ParticipantDto[]>(
      `${this.baseUrl}/chats/${chatId}/participants`
    );
  }

  addParticipant(
    chatId: string,
    request: AddParticipantRequest
  ): Observable<void> {
    return this.httpService.post<void>(
      `${this.baseUrl}/chats/${chatId}/participants`,
      request
    );
  }

  removeParticipant(chatId: string, userId: string): Observable<void> {
    return this.httpService.delete<void>(
      `${this.baseUrl}/chats/${chatId}/participants/${userId}`
    );
  }

  getChatMessages(
    chatId: string,
    pageIndex: number = 1,
    pageSize: number = 50
  ): Observable<PagedResult<MessageDto>> {
    const params = new HttpParams()
      .set('pageIndex', pageIndex.toString())
      .set('pageSize', pageSize.toString());

    return this.httpService.get<PagedResult<MessageDto>>(
      `${this.baseUrl}/messages/chat/${chatId}`,
      params
    );
  }

  sendMessage(request: SendMessageRequest): Observable<string> {
    return this.httpService.post<string>(`${this.baseUrl}/messages`, request);
  }

  sendMessageWithFile(request: SendMessageWithFileRequest): Observable<string> {
    return this.httpService.post<string>(
      `${this.baseUrl}/messages/with-file`,
      request
    );
  }

  editMessage(
    messageId: string,
    request: EditMessageRequest
  ): Observable<void> {
    return this.httpService.put<void>(
      `${this.baseUrl}/messages/${messageId}`,
      request
    );
  }

  deleteMessage(messageId: string): Observable<void> {
    return this.httpService.delete<void>(
      `${this.baseUrl}/messages/${messageId}`
    );
  }

  markMessageAsRead(messageId: string): Observable<void> {
    return this.httpService.post<void>(
      `${this.baseUrl}/messages/${messageId}/mark-read`,
      {}
    );
  }

  setOperatorStatus(request: SetStatusRequest): Observable<void> {
    return this.httpService.post<void>(
      `${this.baseUrl}/operators/status`,
      request
    );
  }

  getMyOperatorChats(
    activeOnly: boolean = false
  ): Observable<ChatSummaryDto[]> {
    const params = new HttpParams().set('activeOnly', activeOnly.toString());
    return this.httpService.get<ChatSummaryDto[]>(
      `${this.baseUrl}/operators/my-chats`,
      params
    );
  }

  getOperatorChats(
    operatorId: string,
    activeOnly: boolean = false
  ): Observable<ChatSummaryDto[]> {
    const params = new HttpParams().set('activeOnly', activeOnly.toString());
    return this.httpService.get<ChatSummaryDto[]>(
      `${this.baseUrl}/operators/${operatorId}/chats`,
      params
    );
  }
}
