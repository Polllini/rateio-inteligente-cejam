
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { FileSpreadsheet, Download, Info } from "lucide-react";
import FileUpload from "@/components/FileUpload";
import Logo from "@/components/Logo";
import ProcessingAnimation from "@/components/ProcessingAnimation";
import { processarRateio } from "@/utils/rateioUtils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const Index = () => {
  const [projetosFile, setProjetosFile] = useState<File | null>(null);
  const [naturezasFile, setNaturezasFile] = useState<File | null>(null);
  const [despesasFile, setDespesasFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleProcessar = async () => {
    if (!projetosFile || !naturezasFile || !despesasFile) {
      toast({
        title: "Arquivos necessários",
        description: "Por favor, carregue todos os arquivos necessários.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      await processarRateio(projetosFile, naturezasFile, despesasFile);
      toast({
        title: "Processamento concluído",
        description: "Os dados foram processados com sucesso!",
      });
    } catch (error) {
      console.error("Erro ao processar:", error);
      toast({
        title: "Erro no processamento",
        description: "Ocorreu um erro ao processar os arquivos.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-100">
      <header className="border-b shadow-sm p-4">
        <div className="container mx-auto">
          <Logo />
        </div>
      </header>

      <main className="container mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold text-cejam-blue mb-2">Sistema de Rateio Inteligente</h1>
        <p className="text-muted-foreground mb-8">
          Carregue os arquivos Excel necessários para realizar o rateio de despesas entre projetos.
        </p>

        <Alert className="mb-6 bg-cejam-light border-cejam-blue">
          <Info className="h-4 w-4 text-cejam-blue" />
          <AlertTitle>Atenção</AlertTitle>
          <AlertDescription>
            Os arquivos devem seguir o mesmo formato da versão anterior do sistema.
            Certifique-se de que os arquivos estejam no formato Excel (.xlsx ou .xls).
          </AlertDescription>
        </Alert>

        {isProcessing ? (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <ProcessingAnimation />
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-3 gap-6 mb-6">
            <FileUpload
              label="Projetos"
              description="Carregue o arquivo de projetos"
              onFileSelected={setProjetosFile}
              selectedFile={projetosFile}
            />
            <FileUpload
              label="Naturezas"
              description="Carregue o arquivo de naturezas"
              onFileSelected={setNaturezasFile}
              selectedFile={naturezasFile}
            />
            <FileUpload
              label="Despesas"
              description="Carregue o arquivo de despesas"
              onFileSelected={setDespesasFile}
              selectedFile={despesasFile}
            />
          </div>
        )}

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-cejam-blue">Como funciona?</CardTitle>
            <CardDescription>
              O sistema de rateio inteligente distribui as despesas entre os projetos seguindo regras 
              específicas e gera um relatório detalhado.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="border rounded-lg p-4">
                <div className="mb-2 flex items-center gap-2 font-medium">
                  <FileSpreadsheet className="h-5 w-5 text-cejam-blue" />
                  Entrada de Dados
                </div>
                <p className="text-sm text-muted-foreground">
                  Carregue os três arquivos Excel necessários: projetos, naturezas e despesas.
                </p>
              </div>
              <div className="border rounded-lg p-4">
                <div className="mb-2 flex items-center gap-2 font-medium">
                  <svg className="h-5 w-5 text-cejam-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Processamento
                </div>
                <p className="text-sm text-muted-foreground">
                  O sistema distribuirá as despesas entre os projetos seguindo as regras de rateio.
                </p>
              </div>
              <div className="border rounded-lg p-4">
                <div className="mb-2 flex items-center gap-2 font-medium">
                  <Download className="h-5 w-5 text-cejam-blue" />
                  Resultado
                </div>
                <p className="text-sm text-muted-foreground">
                  O sistema gera um arquivo Excel com três planilhas: despesas rateadas, não alocadas e resumo.
                </p>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={handleProcessar} 
              disabled={isProcessing || !projetosFile || !naturezasFile || !despesasFile}
              className="w-full bg-gradient-to-r from-cejam-blue to-cejam-green hover:opacity-90"
            >
              {isProcessing ? "Processando..." : "Processar Rateio"}
            </Button>
          </CardFooter>
        </Card>

        <div className="text-center text-sm text-muted-foreground">
          <p>Sistema de Rateio Inteligente CEJAM © {new Date().getFullYear()}</p>
        </div>
      </main>
    </div>
  );
};

export default Index;
