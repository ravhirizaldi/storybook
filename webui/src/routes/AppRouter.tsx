import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { RequireAuth } from '../lib/auth/RequireAuth';
import { CharactersPage } from '../pages/CharactersPage/CharactersPage';
import { CreateProjectPage } from '../pages/CreateProjectPage/CreateProjectPage';
import { DashboardPage } from '../pages/DashboardPage/DashboardPage';
import { LoginPage } from '../pages/LoginPage/LoginPage';
import { MemoriesPage } from '../pages/MemoriesPage/MemoriesPage';
import { StoryProjectPage } from '../pages/StoryProjectPage/StoryProjectPage';

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<RequireAuth />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/projects/new" element={<CreateProjectPage />} />
          <Route path="/projects/:projectId" element={<StoryProjectPage />} />
          <Route path="/projects/:projectId/characters" element={<CharactersPage />} />
          <Route path="/projects/:projectId/memories" element={<MemoriesPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
