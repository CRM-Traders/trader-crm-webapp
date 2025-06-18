// src/app/features/clients/models/note.model.ts

export interface ClientNote {
  id: string;
  commentId: string;
  note: string;
  isPinnedComment: boolean;
  pinnedDate?: Date | null;
  createdAt: Date;
  createdBy: string;
}

export interface NoteCreateRequest {
  clientId: string;
  subject?: string | null;
  note: string;
  isPinnedComment: boolean;
}

export interface NoteCreateResponse {
  clientCommentId: string;
  commentId: string;
}
