import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { AppShell } from '../../components/layout/AppShell';
import { ChapterEditor } from '../../components/story/ChapterEditor';
import { ChapterTree } from '../../components/story/ChapterTree';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ErrorState } from '../../components/ui/ErrorState';
import { LoadingState } from '../../components/ui/LoadingState';
import { StatusPill } from '../../components/ui/StatusPill';
import { apiClient } from '../../lib/api/client';
import { useProjectRealtime } from '../../lib/realtime/useProjectRealtime';

export function StoryProjectPage() {
  const { projectId = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [editorValue, setEditorValue] = useState('');
  const [actionNotice, setActionNotice] = useState<{
    type: 'idle' | 'info' | 'success' | 'error';
    message: string;
  }>({
    type: 'idle',
    message: '',
  });
  const realtimeQueryKeys = useMemo(
    () => [
      ['project', projectId],
      ['parts', projectId],
      ['chapters', projectId],
      ['characters', projectId],
      ['memories', projectId],
      ['jobs', projectId],
    ],
    [projectId],
  );
  const realtime = useProjectRealtime({
    projectId,
    queryKeys: realtimeQueryKeys,
    enabled: Boolean(projectId),
  });
  const fallbackRefetchInterval = realtime.connected ? false : 4000;

  const projectQuery = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => apiClient.getProject(projectId),
    enabled: Boolean(projectId),
  });

  const partsQuery = useQuery({
    queryKey: ['parts', projectId],
    queryFn: () => apiClient.listParts(projectId),
    enabled: Boolean(projectId),
  });

  const chaptersQuery = useQuery({
    queryKey: ['chapters', projectId],
    queryFn: () => apiClient.listChapters(projectId),
    enabled: Boolean(projectId),
    refetchInterval: fallbackRefetchInterval,
  });

  const charactersQuery = useQuery({
    queryKey: ['characters', projectId],
    queryFn: () => apiClient.listCharacters(projectId),
    enabled: Boolean(projectId),
    refetchInterval: fallbackRefetchInterval,
  });

  const memoriesQuery = useQuery({
    queryKey: ['memories', projectId],
    queryFn: () => apiClient.listMemories(projectId),
    enabled: Boolean(projectId),
    refetchInterval: fallbackRefetchInterval,
  });

  const jobsQuery = useQuery({
    queryKey: ['jobs', projectId],
    queryFn: () => apiClient.listJobs(projectId),
    enabled: Boolean(projectId),
    refetchInterval: fallbackRefetchInterval,
  });

  const selectedChapter = useMemo(
    () => chaptersQuery.data?.find((chapter) => chapter.id === selectedChapterId) ?? null,
    [chaptersQuery.data, selectedChapterId],
  );

  useEffect(() => {
    if (!selectedChapterId && chaptersQuery.data?.length) {
      setSelectedChapterId(chaptersQuery.data[0].id);
    }
  }, [chaptersQuery.data, selectedChapterId]);

  useEffect(() => {
    if (selectedChapter) setEditorValue(selectedChapter.content);
  }, [selectedChapter]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedChapterId) throw new Error('Select chapter first.');
      return apiClient.updateChapter(selectedChapterId, { content: editorValue });
    },
    onSuccess: async () => {
      setActionNotice({ type: 'success', message: 'Chapter saved.' });
      await queryClient.invalidateQueries({ queryKey: ['chapters', projectId] });
    },
    onError: (error) => {
      setActionNotice({ type: 'error', message: (error as Error).message });
    },
  });

  const actionMutation = useMutation({
    mutationFn: async (action: 'generate' | 'regenerate' | 'continue' | 'summarize') => {
      if (!selectedChapterId) throw new Error('Select chapter first.');
      if (action === 'generate') return apiClient.generateChapter(selectedChapterId);
      if (action === 'regenerate') return apiClient.regenerateChapter(selectedChapterId);
      if (action === 'continue') return apiClient.continueChapter(selectedChapterId);
      return apiClient.summarizeChapter(selectedChapterId);
    },
    onMutate: (action) => {
      setActionNotice({
        type: 'info',
        message: `${action} request sent...`,
      });
    },
    onSuccess: async (data, action) => {
      const jobId = (data as { jobId?: string } | undefined)?.jobId;
      setActionNotice({
        type: 'success',
        message: jobId ? `${action} queued. Job: ${jobId}` : `${action} queued.`,
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['jobs', projectId] }),
        queryClient.invalidateQueries({ queryKey: ['chapters', projectId] }),
      ]);
    },
    onError: (error, action) => {
      setActionNotice({ type: 'error', message: `${action} failed: ${(error as Error).message}` });
    },
  });

  const generateAllMutation = useMutation({
    mutationFn: () => apiClient.generateAllChapters(projectId),
    onSuccess: async () => {
      setActionNotice({ type: 'success', message: 'Generate all chapters queued.' });
      await queryClient.invalidateQueries({ queryKey: ['jobs', projectId] });
    },
    onError: (error) => {
      setActionNotice({ type: 'error', message: (error as Error).message });
    },
  });

  if (projectQuery.isLoading || partsQuery.isLoading || chaptersQuery.isLoading) {
    return (
      <AppShell>
        <LoadingState label="Loading story project..." />
      </AppShell>
    );
  }

  if (projectQuery.isError || partsQuery.isError || chaptersQuery.isError) {
    return (
      <AppShell>
        <ErrorState
          message={
            (projectQuery.error as Error)?.message ||
            (partsQuery.error as Error)?.message ||
            (chaptersQuery.error as Error)?.message
          }
        />
      </AppShell>
    );
  }

  const project = projectQuery.data!;

  return (
    <AppShell>
      <section className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-line bg-panel p-3">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">{project.title}</h1>
          <div className="flex items-center gap-2">
            <StatusPill status={project.status} />
            <span className="text-xs text-muted">{project.genre}</span>
            <Badge
              className={
                realtime.connected
                  ? 'border-emerald-400/30 text-emerald-300'
                  : 'border-amber-400/30 text-amber-300'
              }
            >
              {realtime.connected ? 'Live' : 'Reconnecting...'}
            </Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => navigate(`/projects/${projectId}/characters`)}>
            Characters
          </Button>
          <Button variant="secondary" onClick={() => navigate(`/projects/${projectId}/memories`)}>
            Memories
          </Button>
          <Button
            onClick={() => generateAllMutation.mutate()}
            disabled={generateAllMutation.isPending}
          >
            Generate All Chapters
          </Button>
        </div>
      </section>
      {actionNotice.type !== 'idle' && (
        <section className="mb-4">
          <Card
            className={
              actionNotice.type === 'error'
                ? 'border-rose-400/40 bg-rose-500/10 text-rose-100'
                : actionNotice.type === 'success'
                  ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100'
                  : 'border-blue-400/30 bg-blue-500/10 text-blue-100'
            }
          >
            <p className="text-sm">{actionNotice.message}</p>
          </Card>
        </section>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[300px_minmax(0,1fr)_340px]">
        <aside className="space-y-3">
          <ChapterTree
            parts={partsQuery.data ?? []}
            chapters={chaptersQuery.data ?? []}
            selectedChapterId={selectedChapterId}
            onSelectChapter={setSelectedChapterId}
          />
        </aside>

        <ChapterEditor
          chapter={selectedChapter}
          value={editorValue}
          onChange={setEditorValue}
          onSave={() => saveMutation.mutate()}
          onGenerate={() => actionMutation.mutate('generate')}
          onRegenerate={() => actionMutation.mutate('regenerate')}
          onContinue={() => actionMutation.mutate('continue')}
          onSummarize={() => actionMutation.mutate('summarize')}
          saving={saveMutation.isPending}
          actionPending={actionMutation.isPending}
        />

        <aside className="space-y-3">
          <Card className="space-y-2">
            <h3 className="text-sm font-semibold">Story Bible Summary</h3>
            <p className="text-sm text-muted">
              {project.storyBible?.summary || 'Waiting for outline.'}
            </p>
          </Card>
          <Card className="space-y-2">
            <h3 className="text-sm font-semibold">Active Characters</h3>
            <ul className="space-y-1 text-sm text-muted">
              {charactersQuery.data?.slice(0, 8).map((character) => (
                <li key={character.id}>
                  {character.name} - {character.emotionalState || 'stable'}
                </li>
              ))}
            </ul>
          </Card>
          <Card className="space-y-2">
            <h3 className="text-sm font-semibold">Relevant Memories</h3>
            <ul className="space-y-2 text-xs text-muted">
              {memoriesQuery.data?.slice(0, 8).map((memory) => (
                <li key={memory.id}>
                  <strong>{memory.title}</strong>
                  <p>{memory.content}</p>
                </li>
              ))}
            </ul>
          </Card>
          <Card className="space-y-2">
            <h3 className="text-sm font-semibold">Jobs</h3>
            <ul className="space-y-1 text-xs text-muted">
              {jobsQuery.data?.slice(0, 8).map((job) => (
                <li key={job.id}>
                  {job.type} - {job.status}
                </li>
              ))}
            </ul>
          </Card>
          <Card className="space-y-2">
            <h3 className="text-sm font-semibold">AI Generation Settings</h3>
            <p className="text-xs text-muted">Language: {project.outputLanguage}</p>
            <p className="text-xs text-muted">Tone: {project.tone}</p>
            <p className="text-xs text-muted">Pacing: {project.pacing}</p>
            <p className="text-xs text-muted">Temperature: {project.temperature}</p>
          </Card>
        </aside>
      </div>
    </AppShell>
  );
}
