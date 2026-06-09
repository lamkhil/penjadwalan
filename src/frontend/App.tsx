import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { LoginPage } from '../auth/LoginPage';
import { RequireAuth } from '../auth/RequireAuth';
import { useAuth } from '../auth/AuthProvider';
import { GridPage } from './grid/GridPage';
import { TeacherList } from './master/TeacherList';
import { ClassroomList } from './master/ClassroomList';
import { StudentList } from './master/StudentList';

function Shell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">Penjadwalan&nbsp;<span className="muted">Sparks</span></div>
        <nav className="mainnav">
          <NavLink to="/grid">Grid Jadwal</NavLink>
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
