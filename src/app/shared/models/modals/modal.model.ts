export interface ModalConfig {
  id?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closable?: boolean;
  backdrop?: boolean;
  keyboard?: boolean;
  centered?: boolean;
  scrollable?: boolean;
  animation?: boolean;
  customClass?: string;
}

export interface ModalData {
  [key: string]: any;
}

export interface ModalRef {
  id: string;
  component?: any;
  config: ModalConfig;
  data?: ModalData;
  close: (result?: any) => void;
  dismiss: (reason?: any) => void;
  result: Promise<any>;
  dismissed: Promise<any>;
}
