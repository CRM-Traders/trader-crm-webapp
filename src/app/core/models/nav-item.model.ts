import { UserPermission, UserRole } from './roles.model';

export interface NavItem {
  label: string;
  icon: string;
  route: string;
  requiredRoles?: UserPermission[];
  children?: NavItem[];
  notificationCount?: number;
}
