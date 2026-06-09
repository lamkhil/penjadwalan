import { useEffect } from 'react';
import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { LoginPage } from '../auth/LoginPage';
import { RequireAuth } from '../auth/RequireAuth';
import { useAuth } from '../auth/AuthProvider';
import { autoCompleteExpired } from '@lib/repo';
import { queryKeys } from '@lib/queryKeys';
import { GridPage } from './grid/GridPage';
import { ClassList } from './master/ClassList';
import { TeacherList } from './master/TeacherList';
import { ClassroomList } from './master/ClassroomList';
import { StudentList } from './master/StudentList';

function Shell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const qc = useQueryClient();

  // Sekali per sesi: tandai Selesai kelas yang tanggal akhirnya sudah lewat.
  useEffect(() => {
    autoCompleteExpired()
      .then((n) => { if (n > 0) qc.invalidateQueries({ queryKey: queryKeys.classes }); })
      .catch(() => { /* abaikan; bukan kritis */ });
  }, [qc]);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">Penjadwalan&nbsp;<span className="muted">Sparks SKL</span></div>
        <nav className="mainnav">
          <NavLink to="/grid">Grid Jadwal</NavLink>
          <NavLink to="/classes">Kelas</NavLink>
          <NavLink to="/teachers">Teacher</NavLink>
          <NavLink to="/classrooms">Ruang</NavLink>
          <NavLink to="/students">Siswa</NavLink>
        </nav>
        <div className="topbar-right">
          <span className="muted small">{user?.email}</span>
          <button className="ghost" onClick={() => void logout()}>Keluar</button>
        </div>
      </header>
      <main className="content">{children}</main>
    </div>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/grid"
        element={
          <RequireAuth>
            <Shell><GridPage /></Shell>
          </RequireAuth>
        }
      />
      <Route
        path="/classes"
        element={
          <RequireAuth>
            <Shell><ClassList /></Shell>
          </RequireAuth>
        }
      />
      <Route
        path="/teachers"
        element={
          <RequireAuth>
            <Shell><TeacherList /></Shell>
          </RequireAuth>
        }
      />
      <Route
        path="/classrooms"
        element={
          <RequireAuth>
            <Shell><ClassroomList /></Shell>
          </RequireAuth>
        }
      />
      <Route
        path="/students"
        element={
          <RequireAuth>
            <Shell><StudentList /></Shell>
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/grid" replace />} />
    </Routes>
  );
}
