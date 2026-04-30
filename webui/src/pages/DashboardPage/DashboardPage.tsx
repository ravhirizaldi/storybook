import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { AppShell } from '../../components/layout/AppShell';
import { StatusPill } from '../../components/ui/StatusPill';
import { apiClient } from '../../lib/api/client';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { LoadingState } from '../../components/ui/LoadingState';
import { Modal } from '../../components/ui/Modal';
import { useAuthStore } from '../../stores/authStore';

export function DashboardPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isAdmin = user?.username === 'admin' || user?.isAdmin;
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const projectsQuery = useQuery({
    queryKey: ['projects'],
    queryFn: apiClient.listProjects,
  });
  const aiSettingsQuery = useQuery({
    queryKey: ['admin-ai-settings'],
    queryFn: apiClient.getAiSettings,
    enabled: Boolean(isAdmin),
  });
  const [form, setForm] = useState({
    apiKey: '',
    baseUrl: '',
    model: '',
    embeddingModel: '',
    embeddingApiKey: '',
    embeddingBaseUrl: '',
    temperature: '0.85',
    topP: '0.95',
    maxTokens: '4000',
    contextMaxChars: '24000',
  });

  useEffect(() => {
    if (!aiSettingsQuery.data) return;
    setForm({
      apiKey: aiSettingsQuery.data.apiKey,
      baseUrl: aiSettingsQuery.data.baseUrl,
      model: aiSettingsQuery.data.model,
      embeddingModel: aiSettingsQuery.data.embeddingModel,
      embeddingApiKey: aiSettingsQuery.data.embeddingApiKey,
      embeddingBaseUrl: aiSettingsQuery.data.embeddingBaseUrl,
      temperature: String(aiSettingsQuery.data.temperature),
      topP: String(aiSettingsQuery.data.topP),
      maxTokens: String(aiSettingsQuery.data.maxTokens),
      contextMaxChars: String(aiSettingsQuery.data.contextMaxChars),
    });
  }, [aiSettingsQuery.data]);

  const updateSettingsMutation = useMutation({
    mutationFn: () =>
      apiClient.updateAiSettings({
        apiKey: form.apiKey,
        baseUrl: form.baseUrl,
        model: form.model,
        embeddingModel: form.embeddingModel,
        embeddingApiKey: form.embeddingApiKey,
        embeddingBaseUrl: form.embeddingBaseUrl,
        temperature: Number(form.temperature),
        topP: Number(form.topP),
        maxTokens: Number(form.maxTokens),
        contextMaxChars: Number(form.contextMaxChars),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-ai-settings'] });
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: (projectId: string) => apiClient.deleteProject(projectId),
    onSuccess: async () => {
      setDeleteTarget(null);
      await queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  return (
    <AppShell>
      <section className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Story Projects</h1>
        <Link to="/projects/new">
          <Button>Create New Project</Button>
        </Link>
      </section>

      {projectsQuery.isLoading && <LoadingState label="Loading projects..." />}
      {projectsQuery.isError && <ErrorState message={(projectsQuery.error as Error).message} />}
      {projectsQuery.data && projectsQuery.data.length === 0 && (
        <EmptyState
          title="No projects yet"
          message="Create project from master prompt to generate title, bible, parts, and chapters."
        />
      )}

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {projectsQuery.data?.map((project) => (
          <Card key={project.id} className="space-y-2 transition hover:border-accent/50">
            <div className="flex items-center justify-between gap-2">
              <button
                className="text-left"
                onClick={() => navigate(`/projects/${project.id}`)}
                aria-label={`Open ${project.title}`}
              >
                <h2 className="text-lg font-semibold">{project.title}</h2>
              </button>
              <StatusPill status={project.status} />
            </div>
            <p className="line-clamp-3 text-sm text-muted">{project.masterPrompt}</p>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => navigate(`/projects/${project.id}`)}>
                Open
              </Button>
              <Button
                variant="danger"
                onClick={() =>
                  setDeleteTarget({
                    id: project.id,
                    title: project.title,
                  })
                }
              >
                Delete
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <Modal
        open={Boolean(deleteTarget)}
        title="Delete Project"
        onClose={() => {
          if (!deleteProjectMutation.isPending) setDeleteTarget(null);
        }}
      >
        <div className="space-y-4">
          <p className="text-sm text-muted">
            Delete <span className="text-white">{deleteTarget?.title}</span>? This removes project,
            chapters, characters, memories, and jobs.
          </p>
          {deleteProjectMutation.isError && (
            <ErrorState message={(deleteProjectMutation.error as Error).message} />
          )}
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => setDeleteTarget(null)}
              disabled={deleteProjectMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => deleteProjectMutation.mutate(deleteTarget!.id)}
              disabled={deleteProjectMutation.isPending}
            >
              {deleteProjectMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
      </Modal>

      {isAdmin && (
        <Card className="mt-6 space-y-4">
          <h2 className="text-lg font-semibold">Admin AI Runtime Settings</h2>
          <p className="text-sm text-muted">
            Changes apply live to backend and worker next AI call.
          </p>
          {aiSettingsQuery.isLoading && <LoadingState label="Loading AI settings..." />}
          {aiSettingsQuery.isError && (
            <ErrorState message={(aiSettingsQuery.error as Error).message} />
          )}

          <div className="space-y-4">
            <div className="rounded-lg border border-white/10 p-4 space-y-3">
              <h3 className="text-sm font-semibold text-accent">LLM (Story Generation)</h3>
              <p className="text-xs text-muted">Used for outline planning, chapter writing, and prompt refinement.</p>
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs text-muted">API Key</label>
                  <Input
                    type="password"
                    value={form.apiKey}
                    onChange={(e) => setForm((prev) => ({ ...prev, apiKey: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted">Base URL</label>
                  <Input
                    value={form.baseUrl}
                    placeholder="https://api.openai.com/v1"
                    onChange={(e) => setForm((prev) => ({ ...prev, baseUrl: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted">Model</label>
                  <Input
                    value={form.model}
                    placeholder="gpt-4.1-mini"
                    onChange={(e) => setForm((prev) => ({ ...prev, model: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-white/10 p-4 space-y-3">
              <h3 className="text-sm font-semibold text-accent">Embedding Model</h3>
              <p className="text-xs text-muted">Used for vector embeddings and memory retrieval. Leave API Key and Base URL empty to use the same as LLM.</p>
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs text-muted">API Key (leave empty to use LLM key)</label>
                  <Input
                    type="password"
                    value={form.embeddingApiKey}
                    onChange={(e) => setForm((prev) => ({ ...prev, embeddingApiKey: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted">Base URL (leave empty to use LLM URL)</label>
                  <Input
                    value={form.embeddingBaseUrl}
                    placeholder="https://api.openai.com/v1"
                    onChange={(e) => setForm((prev) => ({ ...prev, embeddingBaseUrl: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted">Model</label>
                  <Input
                    value={form.embeddingModel}
                    placeholder="text-embedding-3-small"
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, embeddingModel: e.target.value }))
                    }
                  />
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-white/10 p-4 space-y-3">
              <h3 className="text-sm font-semibold text-accent">Generation Parameters</h3>
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs text-muted">Temperature</label>
                  <Input
                    type="number"
                    min={0}
                    max={2}
                    step={0.01}
                    value={form.temperature}
                    onChange={(e) => setForm((prev) => ({ ...prev, temperature: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted">Top P</label>
                  <Input
                    type="number"
                    min={0}
                    max={1}
                    step={0.01}
                    value={form.topP}
                    onChange={(e) => setForm((prev) => ({ ...prev, topP: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted">Max Tokens</label>
                  <Input
                    type="number"
                    min={128}
                    value={form.maxTokens}
                    onChange={(e) => setForm((prev) => ({ ...prev, maxTokens: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted">Context Max Chars</label>
                  <Input
                    type="number"
                    min={2000}
                    value={form.contextMaxChars}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, contextMaxChars: e.target.value }))
                    }
                  />
                </div>
              </div>
            </div>
          </div>

          {updateSettingsMutation.isError && (
            <ErrorState message={(updateSettingsMutation.error as Error).message} />
          )}
          <div className="flex items-center gap-2">
            <Button onClick={() => updateSettingsMutation.mutate()} disabled={updateSettingsMutation.isPending}>
              {updateSettingsMutation.isPending ? 'Saving...' : 'Save Runtime Settings'}
            </Button>
          </div>
        </Card>
      )}
    </AppShell>
  );
}
