import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../../components/layout/AppShell';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Dropdown } from '../../components/ui/Dropdown';
import { ErrorState } from '../../components/ui/ErrorState';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { apiClient } from '../../lib/api/client';

export function CreateProjectPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [masterPrompt, setMasterPrompt] = useState('');
  const [outputLanguage, setOutputLanguage] = useState('English');
  const [tone, setTone] = useState('Emotionally grounded');
  const [genre, setGenre] = useState('Speculative fiction');
  const [targetChapterCount, setTargetChapterCount] = useState<number | ''>('');
  const [temperature, setTemperature] = useState(0.85);
  const [pacing, setPacing] = useState('Balanced');

  const refineMutation = useMutation({
    mutationFn: () =>
      apiClient.refinePrompt({ rawPrompt: masterPrompt, outputLanguage }),
    onSuccess: (data) => {
      setMasterPrompt(data.refinedPrompt);
    },
  });

  const createMutation = useMutation({
    mutationFn: () =>
      apiClient.createProject({
        masterPrompt,
        outputLanguage,
        tone,
        genre,
        ...(targetChapterCount ? { targetChapterCount } : {}),
        temperature,
        pacing,
      }),
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ['projects'] });
      navigate(`/projects/${data.project.id}`);
    },
  });

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl space-y-4">
        <h1 className="text-2xl font-semibold">Create Story Project</h1>
        <Card className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Master Prompt</label>
              <button
                type="button"
                onClick={() => refineMutation.mutate()}
                disabled={refineMutation.isPending || masterPrompt.trim().length < 10}
                className="inline-flex items-center gap-1.5 rounded-md border border-border/50 bg-surface px-3 py-1 text-xs font-medium text-muted transition-colors hover:bg-surface/80 hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {refineMutation.isPending ? (
                  <>
                    <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Refining...
                  </>
                ) : (
                  <>
                    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 3v1m0 16v1m8.66-13.66l-.71.71M4.05 19.95l-.71.71M21 12h-1M4 12H3m16.66 7.66l-.71-.71M4.05 4.05l-.71-.71" />
                    </svg>
                    Refine Prompt
                  </>
                )}
              </button>
            </div>
            <Textarea
              value={masterPrompt}
              onChange={(event) => setMasterPrompt(event.target.value)}
              className="min-h-[200px]"
              placeholder="Write your raw story idea here — characters, plot, world, tone, anything. Click 'Refine Prompt' to transform it into a structured master prompt."
            />
            {refineMutation.isError && (
              <p className="text-xs text-red-400">{(refineMutation.error as Error).message}</p>
            )}
            <p className="text-[10px] text-muted/60">Write your raw idea, then click Refine Prompt to expand it into a detailed, structured master prompt.</p>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs text-muted">Language</label>
              <Dropdown
                value={outputLanguage}
                onChange={(e) => setOutputLanguage(e.target.value)}
              >
                <option>English</option>
                <option>Bahasa Indonesia</option>
                <option>Spanish</option>
                <option>Japanese</option>
                <option>Korean</option>
              </Dropdown>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted">Tone</label>
              <Dropdown value={tone} onChange={(e) => setTone(e.target.value)}>
                <option>Emotionally grounded</option>
                <option>Dark and gritty</option>
                <option>Light and humorous</option>
                <option>Epic and dramatic</option>
                <option>Suspenseful and tense</option>
              </Dropdown>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted">Genre</label>
              <Dropdown value={genre} onChange={(e) => setGenre(e.target.value)}>
                <option>Speculative fiction</option>
                <option>Literary fiction</option>
                <option>Thriller / Mystery</option>
                <option>Romance</option>
                <option>Science fiction</option>
              </Dropdown>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted">Pacing</label>
              <Dropdown value={pacing} onChange={(e) => setPacing(e.target.value)}>
                <option>Slow burn</option>
                <option>Balanced</option>
                <option>Fast moving</option>
                <option>Cinematic</option>
                <option>Episodic</option>
              </Dropdown>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted">Target Chapters</label>
              <Input
                type="number"
                min={0}
                max={120}
                value={targetChapterCount}
                onChange={(e) => {
                  const v = e.target.value;
                  setTargetChapterCount(v === '' ? '' : Number(v));
                }}
                placeholder="Auto (AI decides)"
              />
              <p className="text-[10px] text-muted/60">Leave empty to let AI decide</p>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted">Creativity</label>
              <Input
                type="number"
                min={0}
                max={2}
                step={0.01}
                value={temperature}
                onChange={(e) => setTemperature(Number(e.target.value))}
              />
            </div>
          </div>

          {createMutation.isError && (
            <ErrorState message={(createMutation.error as Error).message} />
          )}
          <Button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending || masterPrompt.trim().length < 20}
            className="w-full justify-center"
          >
            {createMutation.isPending ? 'Creating...' : 'Create Project'}
          </Button>
        </Card>
      </div>
    </AppShell>
  );
}
