import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { PanelRightClose, PanelRightOpen } from 'lucide-react';
import { AppShell } from '../../components/layout/AppShell';
import { ChapterEditor } from '../../components/story/ChapterEditor';
import { ChapterTree } from '../../components/story/ChapterTree';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
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
  const [treeOpen, setTreeOpen] = useState(true);
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

  // Keep queries active for realtime SSE invalidation
  useQuery({
    queryKey: ['characters', projectId],
    queryFn: () => apiClient.listCharacters(projectId),
    enabled: Boolean(projectId),
    refetchInterval: fallbackRefetchInterval,
  });

  useQuery({
    queryKey: ['memories', projectId],
    queryFn: () => apiClient.listMemories(projectId),
    enabled: Boolean(projectId),
    refetchInterval: fallbackRefetchInterval,
  });

  useQuery({
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
  const isGenerating = project.status === 'outlining' || project.status === 'generating';
  const hasChapters = (chaptersQuery.data?.length ?? 0) > 0;

  return (
    <AppShell>
      {/* Compact header */}
      <section className="mb-3 flex items-center justify-between gap-3 rounded-md border border-line bg-panel px-3 py-2">
        <div className="flex items-center gap-3 overflow-hidden">
          <h1 className="truncate text-base font-semibold">{project.title}</h1>
          <StatusPill status={project.status} />
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
        <div className="flex shrink-0 gap-2">
          <Button
            variant="secondary"
            onClick={() => navigate(`/projects/${projectId}/characters`)}
          >
            Characters
          </Button>
          <Button
            variant="secondary"
            onClick={() => navigate(`/projects/${projectId}/memories`)}
          >
            Memories
          </Button>
          {hasChapters && (
            <Button
              onClick={() => generateAllMutation.mutate()}
              disabled={generateAllMutation.isPending || isGenerating}
            >
              Generate All
            </Button>
          )}
          <Button
            variant="ghost"
            onClick={() => setTreeOpen((prev) => !prev)}
            title={treeOpen ? 'Hide chapter tree' : 'Show chapter tree'}
          >
            {treeOpen ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}
          </Button>
        </div>
      </section>

      {/* Action notice */}
      {actionNotice.type !== 'idle' && (
        <section className="mb-3">
          <div
            className={`rounded-md border px-3 py-2 text-xs ${
              actionNotice.type === 'error'
                ? 'border-rose-400/40 bg-rose-500/10 text-rose-100'
                : actionNotice.type === 'success'
                  ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100'
                  : 'border-blue-400/30 bg-blue-500/10 text-blue-100'
            }`}
          >
            {actionNotice.message}
          </div>
        </section>
      )}

      {/* Outlining state */}
      {project.status === 'outlining' && !hasChapters && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          <p className="text-sm text-muted">Generating story outline...</p>
          <p className="mt-1 text-xs text-muted/60">This may take 30-120 seconds depending on your AI provider</p>
        </div>
      )}

      {/* Main content: editor centered + chapter tree on right */}
      {hasChapters && (
        <div className={`flex gap-4 ${treeOpen ? '' : ''}`}>
          {/* Center: chapter editor */}
          <div className="min-w-0 flex-1">
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
          </div>

          {/* Right: collapsible chapter tree */}
          {treeOpen && (
            <aside className="w-72 shrink-0">
              <div className="sticky top-16 max-h-[calc(100dvh-80px)] overflow-y-auto rounded-md border border-line bg-panel p-2">
                <div className="mb-2 flex items-center justify-between px-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Chapters</h3>
                  <span className="text-[10px] text-muted">{chaptersQuery.data?.length ?? 0} total</span>
                </div>
                <ChapterTree
                  parts={partsQuery.data ?? []}
                  chapters={chaptersQuery.data ?? []}
                  selectedChapterId={selectedChapterId}
                  onSelectChapter={setSelectedChapterId}
                />
              </div>
            </aside>
          )}
        </div>
      )}

      {/* No chapters yet and not outlining */}
      {!hasChapters && project.status !== 'outlining' && (
        <div className="flex flex-col items-center justify-center py-20 text-center text-sm text-muted">
          <p>No chapters yet. The outline may still be processing.</p>
        </div>
      )}
    </AppShell>
  );
}
