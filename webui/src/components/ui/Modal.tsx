import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';
import { Card } from './Card';

type Props = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
};

export function Modal({ open, title, onClose, children }: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <Card className="w-full max-w-lg">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold">{title}</h3>
          <Button variant="ghost" onClick={onClose} aria-label="Close">
            <X size={16} />
          </Button>
        </div>
        {children}
      </Card>
    </div>
  );
}
