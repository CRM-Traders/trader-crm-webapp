export interface Ticket {
  id: string;
  title: string;
  description: string;
  priority: TicketPriority;
  status: TicketStatus;
  type: TicketType;
  customerId: string;
  assignedToUserId?: string;
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  dueDate?: Date;
  createdAt: Date;
  tags: string[];
  viewCount: number;
  commentCount: number;
  attachmentCount: number;
}

export interface TicketDetail extends Ticket {
  resolvedAt?: Date;
  closedAt?: Date;
  resolutionNotes?: string;
  firstResponseAt?: Date;
  comments: TicketComment[];
  attachments: TicketAttachment[];
  statusHistory: TicketStatusHistory[];
}

export interface TicketComment {
  id: string;
  content: string;
  authorId: string;
  isInternal: boolean;
  isEdited: boolean;
  editedAt?: Date;
  createdAt: Date;
  parentCommentId?: string;
  replies: TicketComment[];
}

export interface TicketAttachment {
  id: string;
  fileName: string;
  uploadedBy: string;
  createdAt: Date;
}

export interface TicketStatusHistory {
  id: string;
  fromStatus: TicketStatus;
  toStatus: TicketStatus;
  reason?: string;
  changedBy: string;
  changedAt: Date;
}

export enum TicketPriority {
  Low = 1,
  Normal = 2,
  High = 3,
  Critical = 4,
}

export enum TicketStatus {
  Open = 1,
  InProgress = 2,
  OnHold = 3,
  Resolved = 4,
  Closed = 5,
  Reopened = 6,
}

export enum TicketType {
  Bug = 1,
  Feature = 2,
  Support = 3,
  Improvement = 4,
  Task = 5,
  Question = 6,
  Incident = 7,
}

export interface CreateTicketRequest {
  title: string;
  description: string;
  priority: TicketPriority;
  type: TicketType;
  customerId: string;
  categoryId: string;
  dueDate?: Date;
  tags?: string[];
}

export interface UpdateTicketRequest {
  id: string;
  title: string;
  description: string;
  priority: TicketPriority;
  dueDate?: Date;
  tags?: string[];
}

export interface ChangeTicketStatusRequest {
  id: string;
  status: TicketStatus;
  reason?: string;
}

export interface AssignTicketRequest {
  id: string;
  assignedToUserId?: string;
}

export interface TicketFilters {
  status?: TicketStatus;
  priority?: TicketPriority;
  categoryId?: string;
  assignedToUserId?: string;
  searchTerm?: string;
}

export interface TicketColumn {
  status: TicketStatus;
  title: string;
  tickets: Ticket[];
  color: string;
  icon: string;
}

// Helper functions
export const getStatusLabel = (status: TicketStatus): string => {
  const labels: Record<TicketStatus, string> = {
    [TicketStatus.Open]: 'Open',
    [TicketStatus.InProgress]: 'In Progress',
    [TicketStatus.OnHold]: 'On Hold',
    [TicketStatus.Resolved]: 'Resolved',
    [TicketStatus.Closed]: 'Closed',
    [TicketStatus.Reopened]: 'Reopened',
  };
  return labels[status] || 'Unknown';
};

export const getPriorityLabel = (priority: TicketPriority): string => {
  const labels: Record<TicketPriority, string> = {
    [TicketPriority.Low]: 'Low',
    [TicketPriority.Normal]: 'Normal',
    [TicketPriority.High]: 'High',
    [TicketPriority.Critical]: 'Critical',
  };
  return labels[priority] || 'Unknown';
};

export const getTypeLabel = (type: TicketType): string => {
  const labels: Record<TicketType, string> = {
    [TicketType.Bug]: 'Bug',
    [TicketType.Feature]: 'Feature',
    [TicketType.Support]: 'Support',
    [TicketType.Improvement]: 'Improvement',
    [TicketType.Task]: 'Task',
    [TicketType.Question]: 'Question',
    [TicketType.Incident]: 'Incident',
  };
  return labels[type] || 'Unknown';
};

export const getPriorityColor = (priority: TicketPriority): string => {
  const colors: Record<TicketPriority, string> = {
    [TicketPriority.Low]: 'bg-gray-100 text-gray-800',
    [TicketPriority.Normal]: 'bg-blue-100 text-blue-800',
    [TicketPriority.High]: 'bg-orange-100 text-orange-800',
    [TicketPriority.Critical]: 'bg-red-100 text-red-800',
  };
  return colors[priority] || 'bg-gray-100 text-gray-800';
};

export const getTypeIcon = (type: TicketType): string => {
  const icons: Record<TicketType, string> = {
    [TicketType.Bug]: '🐛',
    [TicketType.Feature]: '✨',
    [TicketType.Support]: '🆘',
    [TicketType.Improvement]: '📈',
    [TicketType.Task]: '📋',
    [TicketType.Question]: '❓',
    [TicketType.Incident]: '🚨',
  };
  return icons[type] || '📋';
};
