import React from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { Navbar } from './components/layout/Navbar';
import { Home } from './pages/Home';

function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-blue-100">
        <Navbar />
        <main>
          <Home />
        </main>
      </div>
    </AuthProvider>
  );
}

export default App;
