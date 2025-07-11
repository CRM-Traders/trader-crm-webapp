// src/app/features/clients/models/client-comments.model.ts

export interface ClientComment {
  id: string;
  commentId: string;
  note: string;
  isPinnedComment: boolean;
  clientId: string;
  comment: string;
  createdBy: string;
  createdById: string;
  createdAt: Date;
  pinnedData: string
}

export interface ClientCommentCreateRequest {
  clientId: string;
  subject?: string;
  note: string;
  isPinnedComment: boolean;
}

export interface ClientCommentUpdateRequest {
  id: string;
  clientId: string;
  subject?: string;
  note: string;
  isPinnedComment: boolean;
}

export interface ClientCommentsResponse {
  items: ClientComment[];
  totalCount: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}