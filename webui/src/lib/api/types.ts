export type AuthUser = {
  id: string;
  username: string;
  isAdmin: boolean;
};

export type AiRuntimeSettings = {
  id: string;
  name: string;
  apiKey: string;
  baseUrl: string;
  model: string;
  embeddingModel: string;
  temperature: number;
  topP: number;
  maxTokens: number;
  contextMaxChars: number;
  createdAt: string;
  updatedAt: string;
};

export type LoginResponse = {
  token: string;
  user: AuthUser;
};

export type Project = {
  id: string;
  userId: string;
  title: string;
  masterPrompt: string;
  outputLanguage: string;
  genre: string;
  tone: string;
  pacing: string;
  temperature: number;
  status: 'draft' | 'outlining' | 'ready' | 'generating' | 'failed';
  createdAt: string;
  updatedAt: string;
};

export type Part = {
  id: string;
  projectId: string;
  title: string;
  description: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type Chapter = {
  id: string;
  projectId: string;
  partId: string | null;
  title: string;
  summary: string;
  content: string;
  status: 'pending' | 'queued' | 'generating' | 'completed' | 'failed';
  sortOrder: number;
  wordCount: number;
  charCount: number;
  arcsJson: { title: string; description: string }[];
  generationPromptSnapshot: string;
  createdAt: string;
  updatedAt: string;
};

export type Character = {
  id: string;
  projectId: string;
  name: string;
  role: string;
  description: string;
  traitsJson: string[];
  goalsJson: string[];
  relationshipsJson: Record<string, unknown>;
  emotionalState: string;
  currentArc: string;
  knownFactsJson: string[];
  firstAppearedChapterId: string | null;
  lastSeenChapterId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MemoryType =
  | 'story_bible'
  | 'plot'
  | 'character'
  | 'world'
  | 'chapter_summary'
  | 'emotional_state'
  | 'user_note';

export type Memory = {
  id: string;
  projectId: string;
  chapterId: string | null;
  characterId: string | null;
  type: MemoryType;
  title: string;
  content: string;
  importance: number;
  metadataJson: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type Job = {
  id: string;
  projectId: string;
  chapterId: string | null;
  type:
    | 'generate_outline'
    | 'generate_chapter'
    | 'continue_chapter'
    | 'regenerate_chapter'
    | 'summarize_chapter'
    | 'extract_characters'
    | 'refresh_memory';
  status: 'queued' | 'running' | 'completed' | 'failed';
  inputJson: Record<string, unknown>;
  outputJson: Record<string, unknown>;
  error: string;
  createdAt: string;
  updatedAt: string;
};
