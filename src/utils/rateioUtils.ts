
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

// Verifica a autenticação antes de processar
const verificarAutenticacao = () => {
  const isAuthenticated = localStorage.getItem('cejam-auth') === 'true';
  if (!isAuthenticated) {
    throw new Error("Usuário não autenticado");
  }
  return true;
};

export const processarRateio = async (
  projetosFile: File, 
  naturezasFile: File, 
  despesasFile: File
): Promise<void> => {
  // Verifica autenticação
  verificarAutenticacao();
  
  try {
    console.log("Iniciando processamento de arquivos...");
    
    // Lógica para processamento dos arquivos
    // Por enquanto simulamos apenas um download de exemplo
    
    // Simulação de tempo de processamento
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Criar um arquivo Excel de exemplo para download
    const wb = XLSX.utils.book_new();
    
    // Planilha de despesas rateadas
    const despesasRateadasData = [
      ["ID", "Data", "Descrição", "Valor", "Projeto", "Valor Rateado"],
      [1, "2023-01-01", "Despesa Exemplo 1", 1000, "Projeto A", 500],
      [1, "2023-01-01", "Despesa Exemplo 1", 1000, "Projeto B", 500],
      [2, "2023-01-15", "Despesa Exemplo 2", 2500, "Projeto A", 1250],
      [2, "2023-01-15", "Despesa Exemplo 2", 2500, "Projeto C", 1250],
    ];
    
    const despesasRateadasWS = XLSX.utils.aoa_to_sheet(despesasRateadasData);
    XLSX.utils.book_append_sheet(wb, despesasRateadasWS, "Despesas Rateadas");
    
    // Planilha de não alocadas
    const naoAlocadasData = [
      ["ID", "Data", "Descrição", "Valor", "Motivo"],
      [3, "2023-02-01", "Despesa Exemplo 3", 3000, "Sem projeto correspondente"],
    ];
    
    const naoAlocadasWS = XLSX.utils.aoa_to_sheet(naoAlocadasData);
    XLSX.utils.book_append_sheet(wb, naoAlocadasWS, "Não Alocadas");
    
    // Planilha de resumo
    const resumoData = [
      ["Projeto", "Total"],
      ["Projeto A", 1750],
      ["Projeto B", 500],
      ["Projeto C", 1250],
      ["Não Alocado", 3000],
    ];
    
    const resumoWS = XLSX.utils.aoa_to_sheet(resumoData);
    XLSX.utils.book_append_sheet(wb, resumoWS, "Resumo");
    
    // Gerar o arquivo para download
    const wbout = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    
    // Download do arquivo
    saveAs(blob, "resultado_rateio.xlsx");
    
    console.log("Processamento concluído com sucesso!");
    return Promise.resolve();
  } catch (error) {
    console.error("Erro ao processar rateio:", error);
    throw error;
  }
};
