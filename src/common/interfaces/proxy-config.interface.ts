export interface ProxyConfig {
  projectName: string;
  targetHost: string;
  targetPort: number;
  customHeaders?: Record<string, string>;
  enabled: boolean;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProxyTarget {
  host: string;
  port: number;
  protocol: 'http' | 'https';
}

export interface ProxyRule {
  id: string;
  projectName: string;
  target: ProxyTarget;
  customHeaders: Record<string, string>;
  enabled: boolean;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}