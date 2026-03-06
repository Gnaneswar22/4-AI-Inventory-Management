import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Sales from './pages/Sales';
import Analytics from './pages/Analytics';
import Forecasting from './pages/Forecasting';
import Login from './pages/Login';
import Chatbot from './components/Chatbot';

const LoadingScreen = () => (
  <div className="min-h-screen bg-slate-900 flex items-center justify-center">
    <div className="flex flex-col items-center gap-6">
      <div className="w-16 h-16 bg-gradient-to-tr from-indigo-600 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30 border border-white/10 animate-pulse">
        <span className="font-bold text-3xl text-white">I</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="font-bold text-xl text-white tracking-tight">Invenio<span className="text-indigo-400">AI</span></span>
      </div>
      <div className="w-8 h-8 border-3 border-white/20 border-t-indigo-400 rounded-full animate-spin"></div>
    </div>
  </div>
);

const AppContent = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard />;
      case 'inventory': return <Inventory />;
      case 'sales': return <Sales />;
      case 'analytics': return <Analytics />;
      case 'forecasting': return <Forecasting />;
      default: return <Dashboard />;
    }
  };

  return (
    <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
      {renderPage()}
      <Chatbot />
    </Layout>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <DataProvider>
        <AppContent />
      </DataProvider>
    </AuthProvider>
  );
};

export default App;