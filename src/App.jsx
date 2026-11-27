import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './hooks/useTheme';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { Dashboard } from './pages/Dashboard';

const About = lazy(() => import('./pages/About').then((m) => ({ default: m.About })));
const Admin = lazy(() => import('./pages/Admin').then((m) => ({ default: m.Admin })));
const Portal = lazy(() => import('./pages/Portal').then((m) => ({ default: m.Portal })));
const AssistantWidget = lazy(() =>
  import('./components/assistant/AssistantWidget').then((m) => ({ default: m.AssistantWidget }))
);

export function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <a href="#main-content" className="skip-link visually-hidden">
          Pular para o conteúdo principal
        </a>
        <Navbar />
        <Suspense fallback={null}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/about" element={<About />} />
            <Route path="/portal" element={<Portal />} />
            <Route path="/admin" element={<Admin />} />
          </Routes>
          <AssistantWidget />
        </Suspense>
        <Footer />
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
