export const REALTIME_CHANNEL = 'story-project-events';

export type RealtimeEvent = {
  type: 'project.refresh';
  projectId: string;
  reason: string;
  chapterId?: string | null;
  at: string;
};
