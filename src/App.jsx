import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './hooks/useTheme';
import { Navbar } from './components/Navbar';
import { Dashboard } from './pages/Dashboard';

const About = lazy(() => import('./pages/About').then((m) => ({ default: m.About })));
const Admin = lazy(() => import('./pages/Admin').then((m) => ({ default: m.Admin })));
const Callback = lazy(() => import('./pages/Callback').then((m) => ({ default: m.Callback })));

export function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Navbar />
        <Suspense fallback={null}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/about" element={<About />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/callback" element={<Callback />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
