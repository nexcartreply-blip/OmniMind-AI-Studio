
export enum AppView {
  DASHBOARD = 'DASHBOARD',
  CHAT = 'CHAT',
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  AUDIO = 'AUDIO',
  LIVE = 'LIVE',
  CODE_WIZARD = 'CODE_WIZARD'
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  parts?: any[];
  groundingMetadata?: any;
}

export interface ProjectFile {
  name: string;
  content: string;
  language: string;
}

export interface CodeVersion {
  id: string;
  files: ProjectFile[];
  timestamp: Date;
  prompt: string;
}

export interface CodeProject {
  id: string;
  title: string;
  files: ProjectFile[];
  messages: Message[];
  updatedAt: Date;
  history: CodeVersion[];
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: Date;
}

export interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  timestamp: Date;
  aspectRatio: string;
}

export interface GeneratedVideo {
  id: string;
  url: string;
  prompt: string;
  timestamp: Date;
}
