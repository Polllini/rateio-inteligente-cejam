
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import Logo from "@/components/Logo";

const Login: React.FC = () => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Verificar se já está autenticado
    const isAuthenticated = localStorage.getItem('cejam-auth');
    if (isAuthenticated === 'true') {
      navigate('/app');
    }
  }, [navigate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password === 'cejam2024') {
      // Senha correta
      localStorage.setItem('cejam-auth', 'true');
      toast({
        title: "Autenticado com sucesso",
        description: "Bem-vindo ao Sistema de Rateio Inteligente",
      });
      navigate('/app');
    } else {
      // Senha incorreta
      setError('Senha incorreta');
      toast({
        title: "Erro de autenticação",
        description: "Senha incorreta. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Logo />
          </div>
          <CardTitle className="text-2xl font-bold text-cejam-blue">
            Sistema de Rateio Inteligente
          </CardTitle>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label htmlFor="password" className="block text-sm font-medium mb-1">
                  Digite a senha de acesso
                </label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Digite a senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={error ? "border-red-500" : ""}
                />
                {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              type="submit"
              className="w-full bg-gradient-to-r from-cejam-blue to-cejam-green hover:opacity-90"
            >
              Acessar
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default Login;
