import { UserRole } from './roles.model';

export interface NavItem {
  label: string;
  icon: string;
  route: string;
  requiredRoles?: UserRole[];
  children?: NavItem[];
  notificationCount?: number;
}
