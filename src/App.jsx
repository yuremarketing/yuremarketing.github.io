import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './hooks/useTheme';
import { Navbar } from './components/Navbar';
import { Dashboard } from './pages/Dashboard';
import { About } from './pages/About';
import { Admin } from './pages/Admin';
import { Callback } from './pages/Callback';

export function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Navbar />
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/about" element={<About />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/callback" element={<Callback />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
