import type { Character } from '../../lib/api/types';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';

type Props = {
  character: Character;
};

export function CharacterCard({ character }: Props) {
  return (
    <Card className="space-y-3">
      <div>
        <h3 className="text-base font-semibold">{character.name}</h3>
        <p className="text-sm text-muted">{character.role}</p>
      </div>
      <p className="text-sm">{character.description}</p>
      <div className="flex flex-wrap gap-2">
        {character.traitsJson.map((trait) => (
          <Badge key={trait}>{trait}</Badge>
        ))}
      </div>
      <div className="text-xs text-muted">
        <p>Goals: {character.goalsJson.join(', ') || '-'}</p>
        <p>State: {character.emotionalState || '-'}</p>
        <p>Arc: {character.currentArc || '-'}</p>
      </div>
    </Card>
  );
}
