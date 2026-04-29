import { getStoredToken } from '../../stores/authStore';
import type {
  AiRuntimeSettings,
  Chapter,
  Character,
  Job,
  LoginResponse,
  Memory,
  MemoryType,
  Part,
  Project,
} from './types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(init?.headers);
  if (init?.body !== undefined && init?.body !== null) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    const text = await response.text();
    try {
      const parsed = JSON.parse(text) as { message?: string };
      throw new Error(parsed.message || text || `Request failed: ${response.status}`);
    } catch {
      throw new Error(text || `Request failed: ${response.status}`);
    }
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export const apiClient = {
  login: (payload: { username: string; password: string }) =>
    request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  me: () => request<{ id: string; username: string; isAdmin: boolean }>('/auth/me'),

  listProjects: () => request<Project[]>('/projects'),
  createProject: (payload: {
    masterPrompt: string;
    outputLanguage: string;
    tone: string;
    genre: string;
    targetChapterCount?: number;
    temperature: number;
    pacing: string;
  }) =>
    request<{ project: Project; jobId: string }>('/projects', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getProject: (projectId: string) =>
    request<Project & { storyBible: any }>(`/projects/${projectId}`),
  updateProject: (projectId: string, payload: Partial<Project>) =>
    request<Project>(`/projects/${projectId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  deleteProject: (projectId: string) =>
    request<void>(`/projects/${projectId}`, {
      method: 'DELETE',
    }),

  generateOutline: (projectId: string) =>
    request<{ jobId: string }>(`/projects/${projectId}/generate-outline`, { method: 'POST' }),
  generateAllChapters: (projectId: string) =>
    request<{ jobIds: string[]; count: number }>(`/projects/${projectId}/generate-all-chapters`, {
      method: 'POST',
    }),

  listParts: (projectId: string) => request<Part[]>(`/projects/${projectId}/parts`),
  listChapters: (projectId: string) => request<Chapter[]>(`/projects/${projectId}/chapters`),
  getChapter: (chapterId: string) => request<Chapter>(`/chapters/${chapterId}`),
  updateChapter: (chapterId: string, payload: Partial<Chapter>) =>
    request<Chapter>(`/chapters/${chapterId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  generateChapter: (chapterId: string) =>
    request<{ jobId: string }>(`/chapters/${chapterId}/generate`, { method: 'POST' }),
  regenerateChapter: (chapterId: string) =>
    request<{ jobId: string }>(`/chapters/${chapterId}/regenerate`, { method: 'POST' }),
  continueChapter: (chapterId: string) =>
    request<{ jobId: string }>(`/chapters/${chapterId}/continue`, { method: 'POST' }),
  summarizeChapter: (chapterId: string) =>
    request<{ jobId: string }>(`/chapters/${chapterId}/summarize`, { method: 'POST' }),

  listCharacters: (projectId: string) => request<Character[]>(`/projects/${projectId}/characters`),
  getCharacter: (characterId: string) => request<Character>(`/characters/${characterId}`),
  updateCharacter: (characterId: string, payload: Partial<Character>) =>
    request<Character>(`/characters/${characterId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  listMemories: (
    projectId: string,
    params?: {
      type?: MemoryType;
      chapterId?: string;
      characterId?: string;
    },
  ) => {
    const qs = new URLSearchParams();
    if (params?.type) qs.set('type', params.type);
    if (params?.chapterId) qs.set('chapterId', params.chapterId);
    if (params?.characterId) qs.set('characterId', params.characterId);
    const query = qs.toString();
    return request<Memory[]>(`/projects/${projectId}/memories${query ? `?${query}` : ''}`);
  },
  createMemory: (
    projectId: string,
    payload: {
      chapterId?: string | null;
      characterId?: string | null;
      type: MemoryType;
      title: string;
      content: string;
      importance: number;
      metadataJson?: Record<string, unknown>;
    },
  ) =>
    request<Memory>(`/projects/${projectId}/memories`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  deleteMemory: (memoryId: string) => request<void>(`/memories/${memoryId}`, { method: 'DELETE' }),
  searchMemories: (
    projectId: string,
    payload: {
      query: string;
      limit?: number;
      type?: MemoryType;
    },
  ) =>
    request<Memory[]>(`/projects/${projectId}/memories/search`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  listJobs: (projectId: string) => request<Job[]>(`/projects/${projectId}/jobs`),
  getJob: (jobId: string) => request<Job>(`/jobs/${jobId}`),
  getAiSettings: () => request<AiRuntimeSettings>('/admin/ai-settings'),
  updateAiSettings: (payload: Partial<AiRuntimeSettings>) =>
    request<AiRuntimeSettings>('/admin/ai-settings', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
};
