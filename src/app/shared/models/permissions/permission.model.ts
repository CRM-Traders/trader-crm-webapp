export enum ActionType {
  View = 1,
  Create = 2,
  Edit = 3,
  Delete = 4,
}

export interface Permission {
  id: string;
  name: string;
  description: string | null;
  actionType: ActionType;
  isGranted: boolean;
}

export interface PermissionSection {
  section: string;
  permissions: Permission[];
}
