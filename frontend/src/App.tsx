import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import AdminLayout from './layouts/AdminLayout';
import AdminGraph from './pages/AdminGraph';

import AdminConfig from './pages/AdminConfig';

import TeamView from './pages/TeamView';
import Leaderboard from './pages/Leaderboard';
import AdminTeams from './pages/AdminTeams';

import Home from './pages/Home';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Home />} />
          <Route path="leaderboard" element={<Leaderboard />} />

          <Route path="t/:token" element={<TeamView />} />
        </Route>

        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="config" />} />
          <Route path="graph" element={<AdminGraph />} />
          <Route path="config" element={<AdminConfig />} />
          <Route path="teams" element={<AdminTeams />} />
          <Route path="leaderboard" element={<Leaderboard />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
