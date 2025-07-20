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

export interface DefaultPermission {
  id: string;
  name: string;
  description: string | null;
  actionType: ActionType;
  isDefault: boolean;
}

export interface PermissionSection {
  section: string;
  permissions: Permission[];
}

export interface DefaultPermissionSection {
  section: string;
  permissions: DefaultPermission[];
}

export interface OperatorPermissionsResponse {
  operatorId: string;
  operatorUserId: string;
  username: string;
  firstname: string;
  lastname: string;
  permissions: PermissionSection[];
}
