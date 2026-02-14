export interface Workspace {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
}

export interface Channel {
  id: string;
  workspaceId: string;
  name: string;
  topic: string;
  createdAt: string;
  slug?: string;
  sortOrder?: number;
  isPremium?: boolean;
}
