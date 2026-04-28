import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { AppShell } from '../../components/layout/AppShell';
import { CharacterCard } from '../../components/characters/CharacterCard';
import { ErrorState } from '../../components/ui/ErrorState';
import { LoadingState } from '../../components/ui/LoadingState';
import { apiClient } from '../../lib/api/client';
import { useProjectRealtime } from '../../lib/realtime/useProjectRealtime';

export function CharactersPage() {
  const { projectId = '' } = useParams();
  const realtimeQueryKeys = useMemo(() => [['characters', projectId]], [projectId]);
  const realtime = useProjectRealtime({
    projectId,
    queryKeys: realtimeQueryKeys,
    enabled: Boolean(projectId),
  });

  const query = useQuery({
    queryKey: ['characters', projectId],
    queryFn: () => apiClient.listCharacters(projectId),
    enabled: Boolean(projectId),
    refetchInterval: realtime.connected ? false : 5000,
  });

  return (
    <AppShell>
      <h1 className="mb-4 text-2xl font-semibold">Characters</h1>
      {query.isLoading && <LoadingState label="Loading characters..." />}
      {query.isError && <ErrorState message={(query.error as Error).message} />}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {query.data?.map((character) => (
          <CharacterCard key={character.id} character={character} />
        ))}
      </div>
    </AppShell>
  );
}
