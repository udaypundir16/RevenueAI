import { useHealthCheck } from './hooks/useHealthCheck';
import { Navbar } from './components/Navbar';
import { DashboardPage } from './pages/DashboardPage';

export function App() {
  const { data, loading, error, latencyMs, lastChecked, refetch } = useHealthCheck(12000);

  const connectionStatus = loading && !data ? 'loading' : error ? 'offline' : 'healthy';

  return (
    <div className="min-h-screen bg-[#0b0f17] text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      <Navbar
        status={connectionStatus}
        latencyMs={latencyMs}
        onRefresh={refetch}
        isRefreshing={loading}
      />

      <div className="flex-1">
        <DashboardPage
          healthData={data}
          loading={loading}
          error={error}
          latencyMs={latencyMs}
          lastChecked={lastChecked}
          onRefresh={refetch}
        />
      </div>

      <footer className="border-t border-slate-800/60 py-6 text-center text-xs text-slate-500">
        <p>Revenue Recovery AI • Full-Stack Architecture • FastAPI + React + Vite + TailwindCSS</p>
      </footer>
    </div>
  );
}

export default App;
