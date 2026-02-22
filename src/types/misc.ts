import { Content, Conversation, Model } from '@shared/types';

// Type for conversations with messages (used in HistoryView)
export type HistoryConversation = Omit<
  Conversation,
  'created_at' | 'updated_at'
> & {
  created_at: string;
  updated_at: string;
  first_message: Content;
  message_count: number;
};

export interface ModelConfig {
  id: Model;
  name: string;
  description: string;
  provider?: string;
  supportsTools?: boolean;
  supportsThinking?: boolean;
  supportsVision?: boolean;
}

export interface MessageItem {
  id: string;
  isUploading?: boolean;
  url?: string;
  source: 'upload' | 'selection' | 'mesh-render';
  // For mesh renders, track which mesh they belong to
  meshId?: string;
}

export interface MeshUploadState {
  id: string;
  filename: string; // Original filename for display/reference
  boundingBox: { x: number; y: number; z: number };
  renderIds: string[];
  isProcessing: boolean;
  // The actual STL file content for OpenSCAD import
  fileContent: Blob;
}
