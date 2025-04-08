
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import { useEffect } from "react";

// Componente para proteger rotas
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = localStorage.getItem('cejam-auth') === 'true';
  
  if (!isAuthenticated) {
    // Redirecionar para página de login se não estiver autenticado
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
};

const queryClient = new QueryClient();

// Componente para evitar redirecionamento de GitHub Pages em produção
const GithubPagesRouter = ({ children }: { children: React.ReactNode }) => {
  useEffect(() => {
    // Tratamento específico para rotas no GitHub Pages
    const path = window.location.pathname;
    const hash = window.location.hash;
    
    if (path.includes("/?/")) {
      const route = path.split("/?/")[1];
      window.history.replaceState(null, "", `/${route}${hash}`);
    }
  }, []);

  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter basename="/rateio-inteligente-cejam">
        <GithubPagesRouter>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/app" element={
              <ProtectedRoute>
                <Index />
              </ProtectedRoute>
            } />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </GithubPagesRouter>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
