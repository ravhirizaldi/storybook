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
  const [targetChapterCount, setTargetChapterCount] = useState(20);
  const [temperature, setTemperature] = useState(0.85);
  const [pacing, setPacing] = useState('Balanced');

  const createMutation = useMutation({
    mutationFn: () =>
      apiClient.createProject({
        masterPrompt,
        outputLanguage,
        tone,
        genre,
        targetChapterCount,
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
            <label className="text-sm font-medium">Master Prompt</label>
            <Textarea
              value={masterPrompt}
              onChange={(event) => setMasterPrompt(event.target.value)}
              className="min-h-[200px]"
              placeholder="Describe story concept, key themes, protagonist conflict, and style expectations."
            />
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
                min={1}
                max={120}
                value={targetChapterCount}
                onChange={(e) => setTargetChapterCount(Number(e.target.value))}
              />
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
