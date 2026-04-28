import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Navigate } from 'react-router-dom';
import { apiClient } from '../../lib/api/client';
import { useAuthStore } from '../../stores/authStore';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ErrorState } from '../../components/ui/ErrorState';
import { Input } from '../../components/ui/Input';

export function LoginPage() {
  const { token, setSession } = useAuthStore();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');

  const loginMutation = useMutation({
    mutationFn: () => apiClient.login({ username, password }),
    onSuccess: (data) => {
      setSession(data.token, data.user);
    },
  });

  if (token) return <Navigate to="/" replace />;

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md space-y-4">
        <h1 className="text-xl font-semibold">StoryForge AI Login</h1>
        <div className="space-y-2">
          <label className="text-sm">Username</label>
          <Input value={username} onChange={(e) => setUsername(e.target.value)} />
        </div>
        <div className="space-y-2">
          <label className="text-sm">Password</label>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {loginMutation.isError && <ErrorState message={(loginMutation.error as Error).message} />}
        <Button className="w-full justify-center" onClick={() => loginMutation.mutate()}>
          Login
        </Button>
      </Card>
    </div>
  );
}
