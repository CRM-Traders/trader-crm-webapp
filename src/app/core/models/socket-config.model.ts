export interface SocketConfig {
  url: string;
  reconnectInterval?: number;
  reconnectAttempts?: number;
  queryParams?: Record<string, string>;
}
