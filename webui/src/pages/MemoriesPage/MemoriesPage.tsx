import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { AppShell } from '../../components/layout/AppShell';
import { MemoryList } from '../../components/memories/MemoryList';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Dropdown } from '../../components/ui/Dropdown';
import { ErrorState } from '../../components/ui/ErrorState';
import { Input } from '../../components/ui/Input';
import { LoadingState } from '../../components/ui/LoadingState';
import { Textarea } from '../../components/ui/Textarea';
import { apiClient } from '../../lib/api/client';
import type { MemoryType } from '../../lib/api/types';
import { useProjectRealtime } from '../../lib/realtime/useProjectRealtime';

const types: MemoryType[] = [
  'story_bible',
  'plot',
  'character',
  'world',
  'chapter_summary',
  'emotional_state',
  'user_note',
];

export function MemoriesPage() {
  const { projectId = '' } = useParams();
  const queryClient = useQueryClient();
  const realtimeQueryKeys = useMemo(() => [['memories', projectId]], [projectId]);
  const realtime = useProjectRealtime({
    projectId,
    queryKeys: realtimeQueryKeys,
    enabled: Boolean(projectId),
  });
  const [typeFilter, setTypeFilter] = useState<MemoryType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [manualType, setManualType] = useState<MemoryType>('user_note');
  const [importance, setImportance] = useState(5);

  const memoriesQuery = useQuery({
    queryKey: ['memories', projectId, typeFilter],
    queryFn: () =>
      apiClient.listMemories(projectId, {
        type: typeFilter === 'all' ? undefined : typeFilter,
      }),
    enabled: Boolean(projectId),
    refetchInterval: realtime.connected ? false : 5000,
  });

  const searchMutation = useMutation({
    mutationFn: () => apiClient.searchMemories(projectId, { query: searchQuery, limit: 25 }),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      apiClient.createMemory(projectId, {
        type: manualType,
        title,
        content,
        importance,
      }),
    onSuccess: async () => {
      setTitle('');
      setContent('');
      await queryClient.invalidateQueries({ queryKey: ['memories', projectId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (memoryId: string) => apiClient.deleteMemory(memoryId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['memories', projectId] });
    },
  });

  const list = useMemo(() => {
    if (searchMutation.data && searchQuery.trim()) return searchMutation.data;
    return memoriesQuery.data ?? [];
  }, [memoriesQuery.data, searchMutation.data, searchQuery]);

  return (
    <AppShell>
      <h1 className="mb-4 text-2xl font-semibold">Memories</h1>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-3">
          <Card className="flex flex-wrap items-end gap-3">
            <div className="min-w-[180px] flex-1 space-y-2">
              <label className="text-xs text-muted">Filter Type</label>
              <Dropdown
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as MemoryType | 'all')}
              >
                <option value="all">all</option>
                {types.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </Dropdown>
            </div>
            <div className="min-w-[220px] flex-[2] space-y-2">
              <label className="text-xs text-muted">Semantic Search</label>
              <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            <Button
              variant="secondary"
              onClick={() => searchMutation.mutate()}
              disabled={!searchQuery.trim() || searchMutation.isPending}
            >
              Search
            </Button>
          </Card>

          {memoriesQuery.isLoading && <LoadingState label="Loading memories..." />}
          {memoriesQuery.isError && <ErrorState message={(memoriesQuery.error as Error).message} />}
          {searchMutation.isError && (
            <ErrorState message={(searchMutation.error as Error).message} />
          )}

          <MemoryList memories={list} onDelete={(memoryId) => deleteMutation.mutate(memoryId)} />
        </div>

        <Card className="space-y-3">
          <h2 className="text-base font-semibold">Add Manual Memory</h2>
          <div className="space-y-2">
            <label className="text-xs text-muted">Type</label>
            <Dropdown
              value={manualType}
              onChange={(e) => setManualType(e.target.value as MemoryType)}
            >
              {types.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </Dropdown>
          </div>
          <div className="space-y-2">
            <label className="text-xs text-muted">Title</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-xs text-muted">Content</label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[140px]"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs text-muted">Importance (1-10)</label>
            <Input
              type="number"
              min={1}
              max={10}
              value={importance}
              onChange={(e) => setImportance(Number(e.target.value))}
            />
          </div>
          {createMutation.isError && (
            <ErrorState message={(createMutation.error as Error).message} />
          )}
          <Button
            onClick={() => createMutation.mutate()}
            disabled={!title.trim() || !content.trim() || createMutation.isPending}
          >
            Add Memory
          </Button>
        </Card>
      </div>
    </AppShell>
  );
}
