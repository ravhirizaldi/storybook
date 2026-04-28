import type { Memory } from '../../lib/api/types';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

type Props = {
  memories: Memory[];
  onDelete: (memoryId: string) => void;
};

export function MemoryList({ memories, onDelete }: Props) {
  return (
    <div className="space-y-2">
      {memories.map((memory) => (
        <Card key={memory.id} className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold">{memory.title}</h3>
              <div className="flex items-center gap-2">
                <Badge>{memory.type}</Badge>
                <Badge>Importance {memory.importance}</Badge>
              </div>
            </div>
            <Button variant="danger" onClick={() => onDelete(memory.id)}>
              Delete
            </Button>
          </div>
          <p className="text-sm text-muted">{memory.content}</p>
        </Card>
      ))}
    </div>
  );
}
