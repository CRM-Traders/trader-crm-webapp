export interface NavItem {
  label: string;
  icon: string;
  route: string;
  permission: number;
  children?: NavItem[];
  notificationCount?: number;
}
