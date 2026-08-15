export type UserRole = "ADMIN" | "ANALYST" | "VIEWER";
export type Sentiment = "POS" | "NEU" | "NEG";
export type FeedbackStatus = "NEW" | "REVIEWED" | "ACTIONED";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  workspaceId: string;
};

export type AppSession = {
  user: SessionUser;
  workspaceId: string;
  expires: string;
};

export type FeedbackFilterParams = {
  q?: string;
  channel?: string;
  sentiment?: Sentiment;
  status?: FeedbackStatus;
  themeId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
};

export type PaginatedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type ChannelType =
  | "Support Ticket"
  | "App Store Review"
  | "NPS Survey"
  | "CSAT Survey"
  | "Sales Notes"
  | "Live Chat"
  | "Social Media"
  | "Community Forum"
  | "Manual Entry";

export const CHANNELS: ChannelType[] = [
  "Support Ticket",
  "App Store Review",
  "NPS Survey",
  "CSAT Survey",
  "Sales Notes",
  "Live Chat",
  "Social Media",
  "Community Forum",
  "Manual Entry",
];
