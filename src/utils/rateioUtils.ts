
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

// Modelo de dados
interface Projeto {
  nome: string;
  limiteOriginal: number;
  limiteAjustado: number;
  naturezasNaoPermitidas: string[];
  totalRateado: number;
  despesasRateadas: any[];
  ultrapassouLimite: boolean;
  podeUltrapassar: boolean;
  percentualLimite: number;
}

interface Despesa {
  fornecedor: string;
  natureza: string;
  valor: number;
  titulo: string;
}

// Verifica a autenticação antes de processar
const verificarAutenticacao = () => {
  const isAuthenticated = localStorage.getItem('cejam-auth') === 'true';
  if (!isAuthenticated) {
    throw new Error("Usuário não autenticado");
  }
  return true;
};

// Função para gerar um percentual aleatório entre 98,45% e 99,92%
const gerarPercentualLimite = () => {
  return Math.random() * (0.9992 - 0.9845) + 0.9845;
};

// Processamento principal
export const processarRateio = async (
  projetosFile: File, 
  naturezasFile: File, 
  despesasFile: File
): Promise<void> => {
  // Verifica autenticação
  verificarAutenticacao();
  
  try {
    console.log("Iniciando processamento de arquivos...");
    
    // Carregar os dados dos arquivos Excel
    const projetosData = await lerArquivoExcel(projetosFile);
    const naturezasData = await lerArquivoExcel(naturezasFile);
    const despesasData = await lerArquivoExcel(despesasFile);
    
    console.log("Arquivos carregados com sucesso");
    
    // Preparar projetos com suas naturezas não permitidas
    const projetos = prepararProjetos(projetosData, naturezasData);
    
    // Preparar despesas
    const despesas = prepararDespesas(despesasData);
    
    // Distribuir despesas
    const despesasNaoAlocadas = distribuirDespesas(despesas, projetos);
    
    // Gerar memória de cálculo
    const resultado = gerarMemoriaCalculo(projetos, despesasNaoAlocadas, projetosData);
    
    console.log("Processamento concluído com sucesso!");
    return Promise.resolve();
  } catch (error) {
    console.error("Erro ao processar rateio:", error);
    throw error;
  }
};

// Função para ler um arquivo Excel
const lerArquivoExcel = async (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        resolve(jsonData);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
};

// Função para preparar os projetos
const prepararProjetos = (projetosData: any[], naturezasData: any[]): Projeto[] => {
  const projetos: Projeto[] = [];
  
  projetosData.forEach((projetoItem) => {
    const nomeProjeto = projetoItem['Nome do Projeto'];
    const limite = projetoItem['Valor Teto'];
    const permiteUltrapassar = projetoItem['Limite'] === 1;
    
    // Filtrar naturezas não permitidas para este projeto
    const naturezasNaoPermitidas = naturezasData
      .filter(n => n['Nome do Projeto'] === nomeProjeto)
      .map(n => n['Naturezas Não Permitidas']);
    
    // Gerar o percentual aleatório
    const percentualLimite = gerarPercentualLimite();
    const limiteAjustado = Number((limite * percentualLimite).toFixed(2));
    
    projetos.push({
      nome: nomeProjeto,
      limiteOriginal: limite,
      limiteAjustado: limiteAjustado,
      naturezasNaoPermitidas: naturezasNaoPermitidas,
      totalRateado: 0,
      despesasRateadas: [],
      ultrapassouLimite: false,
      podeUltrapassar: permiteUltrapassar,
      percentualLimite: percentualLimite
    });
  });
  
  return projetos;
};

// Função para preparar as despesas
const prepararDespesas = (despesasData: any[]): Despesa[] => {
  return despesasData.map(item => ({
    fornecedor: item['Nome Fornece'],
    natureza: item['Natureza'],
    valor: Number(item['Vlr.Titulo']),
    titulo: item['No. Titulo']
  }));
};

// Função para ratear uma despesa em um projeto
const ratearDespesa = (
  projeto: Projeto,
  valor: number,
  natureza: string,
  fornecedor: string,
  titulo: string,
  valorTitulo: number,
  valorRateadoTitulo: number,
  respeitarLimite = true
): number => {
  // Garantir que o valor total rateado não ultrapasse o valor do título
  let valorPermitido = valorTitulo - valorRateadoTitulo;
  valorPermitido = Number(valorPermitido.toFixed(2));
  
  if (valorPermitido <= 0) return 0;
  
  // Valor a ratear é o mínimo entre o valor solicitado e o valor permitido
  let valorARatear = Math.min(valor, valorPermitido);
  valorARatear = Number(valorARatear.toFixed(2));
  
  // Se o projeto não permitir ultrapassar o teto ou se estivermos no modo de respeitar o limite
  let valorAjustado = valorARatear;
  
  if (respeitarLimite || !projeto.podeUltrapassar) {
    const capacidade = Number((projeto.limiteAjustado - projeto.totalRateado).toFixed(2));
    valorAjustado = Math.min(valorARatear, capacidade);
  } else {
    projeto.ultrapassouLimite = true;
  }
  
  valorAjustado = Number(valorAjustado.toFixed(2));
  
  if (valorAjustado > 0) {
    projeto.despesasRateadas.push({
      fornecedor,
      natureza,
      valorRateado: valorAjustado,
      titulo,
      valorTitulo
    });
    
    projeto.totalRateado += valorAjustado;
    projeto.totalRateado = Number(projeto.totalRateado.toFixed(2));
    return valorAjustado;
  }
  
  return 0;
};

// Função para distribuir despesas entre todos os projetos elegíveis
const distribuirDespesas = (despesas: Despesa[], projetos: Projeto[]): any[] => {
  // Ordenar os projetos por limite ajustado decrescente
  const projetosOrdenados = [...projetos].sort((a, b) => b.limiteAjustado - a.limiteAjustado);
  
  const despesasNaoAlocadas: any[] = [];
  
  despesas.forEach(despesa => {
    const { natureza, valor, fornecedor, titulo } = despesa;
    let valorRestante = Number(valor.toFixed(2));
    let valorRateadoTitulo = 0;
    
    // Selecionar todos os projetos elegíveis para o rateio
    const projetosElegiveis = projetosOrdenados.filter(p => 
      !p.naturezasNaoPermitidas.includes(natureza)
    );
    
    if (projetosElegiveis.length > 0) {
      // Dicionário para manter o controle da capacidade restante de cada projeto
      const projetosComCapacidade = new Map();
      
      projetosElegiveis.forEach(p => {
        projetosComCapacidade.set(p, Number((p.limiteAjustado - p.totalRateado).toFixed(2)));
      });
      
      // Loop para distribuir o valor restante enquanto houver projetos com capacidade
      while (valorRestante > 0 && projetosComCapacidade.size > 0) {
        let totalCapacidade = 0;
        
        for (const capacidade of projetosComCapacidade.values()) {
          totalCapacidade += capacidade;
        }
        
        // Evitar divisão por zero
        if (totalCapacidade === 0) break;
        
        for (const [projeto, capacidadeRestante] of projetosComCapacidade.entries()) {
          // Calcular a proporção da capacidade do projeto em relação ao total
          const proporcao = capacidadeRestante / totalCapacidade;
          
          // Calcular o valor a ratear para o projeto atual
          const valorARatear = Math.min(
            Number((valorRestante * proporcao).toFixed(2)),
            capacidadeRestante,
            valorRestante
          );
          
          if (valorARatear > 0) {
            const valorRateado = ratearDespesa(
              projeto,
              valorARatear,
              natureza,
              fornecedor,
              titulo,
              valor,
              valorRateadoTitulo
            );
            
            if (valorRateado > 0) {
              valorRateadoTitulo += valorRateado;
              valorRestante -= valorRateado;
              valorRestante = Number(valorRestante.toFixed(2));
              
              projetosComCapacidade.set(projeto, projetosComCapacidade.get(projeto) - valorRateado);
              
              // Remover o projeto se não tiver mais capacidade
              if (projetosComCapacidade.get(projeto) <= 0) {
                projetosComCapacidade.delete(projeto);
              }
            } else {
              // Se valorRateado for zero, remover o projeto
              projetosComCapacidade.delete(projeto);
            }
          } else {
            // Remover o projeto se não puder mais receber alocações
            projetosComCapacidade.delete(projeto);
          }
        }
        
        // Se não houver mais capacidade nos projetos, interromper o loop
        if (projetosComCapacidade.size === 0) break;
      }
      
      // Se restar algum valor que não foi rateado, alocar rateio extra apenas em projetos que permitem ultrapassar o teto
      if (valorRestante > 0) {
        const projetosExtra = projetosElegiveis
          .filter(p => p.podeUltrapassar)
          .sort((a, b) => b.limiteAjustado - a.limiteAjustado);
        
        for (const projeto of projetosExtra) {
          const valorRateado = ratearDespesa(
            projeto,
            valorRestante,
            natureza,
            fornecedor,
            titulo,
            valor,
            valorRateadoTitulo,
            false
          );
          
          if (valorRateado > 0) {
            valorRateadoTitulo += valorRateado;
            valorRestante -= valorRateado;
            valorRestante = Number(valorRestante.toFixed(2));
            
            if (valorRestante <= 0) break;
          }
        }
      }
      
      // Se ainda restar valor não alocado, adicionar às despesas não alocadas
      if (valorRestante > 0) {
        despesasNaoAlocadas.push({
          fornecedor,
          natureza,
          valorRestante,
          titulo,
          justificativa: "Não foi possível alocar todo o valor"
        });
      }
    } else {
      // Nenhum projeto elegível devido à natureza da despesa
      despesasNaoAlocadas.push({
        fornecedor,
        natureza,
        valorRestante,
        titulo,
        justificativa: "Natureza não permitida"
      });
    }
  });
  
  return despesasNaoAlocadas;
};

// Função para gerar a memória de cálculo
const gerarMemoriaCalculo = (projetos: Projeto[], despesasNaoAlocadas: any[], projetosData: any[]): void => {
  // Preparar dados para a primeira aba - Despesas Rateadas
  const dadosRateadas: any[] = [];
  
  projetos.forEach(projeto => {
    projeto.despesasRateadas.forEach(despesa => {
      dadosRateadas.push({
        'Nome do Projeto': projeto.nome,
        'Nome Fornece': despesa.fornecedor,
        'Natureza': despesa.natureza,
        'Valor Rateado': despesa.valorRateado,
        'Valor Titulo': despesa.valorTitulo,
        'No. Titulo': despesa.titulo
      });
    });
  });
  
  // Preparar dados para a segunda aba - Despesas Não Alocadas
  const dadosNaoAlocadas = despesasNaoAlocadas.map(despesa => ({
    'Nome Fornece': despesa.fornecedor,
    'Natureza': despesa.natureza,
    'Valor Não Alocado': despesa.valorRestante,
    'No. Titulo': despesa.titulo,
    'Justificativa': despesa.justificativa
  }));
  
  // Preparar dados para a terceira aba - Resumo
  const totalPlanoTrabalho = projetosData.reduce((total: number, projeto: any) => total + projeto['Valor Plano'], 0);
  const totalRateado = dadosRateadas.reduce((total: number, despesa: any) => total + despesa['Valor Rateado'], 0);
  
  const dadosResumo = projetos.map(projeto => {
    const projetoOriginal = projetosData.find((p: any) => p['Nome do Projeto'] === projeto.nome);
    const valorMensalPlanoTrabalho = projetoOriginal ? projetoOriginal['Valor Plano'] : 0;
    const valorCorporativoPlanoTrabalho = projeto.limiteOriginal;
    const valorRateadoMes = dadosRateadas
      .filter(d => d['Nome do Projeto'] === projeto.nome)
      .reduce((sum, d) => sum + d['Valor Rateado'], 0);
    
    // Cálculos para as colunas
    const percentualDoPlano = Number(((valorMensalPlanoTrabalho / totalPlanoTrabalho) * 100).toFixed(2));
    const percentualRateioSobrePlano = Number(((valorCorporativoPlanoTrabalho / valorMensalPlanoTrabalho) * 100).toFixed(2));
    const percentualAssumidoRateio = totalRateado > 0 ? Number(((valorRateadoMes / totalRateado) * 100).toFixed(2)) : 0;
    
    return {
      'Nome do Projeto': projeto.nome,
      'Valor Mensal do Plano de Trabalho': valorMensalPlanoTrabalho,
      '% Do Plano': percentualDoPlano,
      'Valor Corporativo em Plano de Trabalho': valorCorporativoPlanoTrabalho,
      '% Rateio sobre Plano': percentualRateioSobrePlano,
      'Valor Rateado no Mês': valorRateadoMes,
      '% Assumido pelo Rateio no Mês': percentualAssumidoRateio
    };
  });
  
  // Criar e salvar o arquivo Excel
  const wb = XLSX.utils.book_new();
  
  // Aba 1: Despesas Rateadas
  const ws1 = XLSX.utils.json_to_sheet(dadosRateadas);
  XLSX.utils.book_append_sheet(wb, ws1, "Despesas Rateadas");
  
  // Aba 2: Despesas Não Alocadas
  const ws2 = XLSX.utils.json_to_sheet(dadosNaoAlocadas);
  XLSX.utils.book_append_sheet(wb, ws2, "Despesas Não Alocadas");
  
  // Aba 3: Resumo Projetos
  const ws3 = XLSX.utils.json_to_sheet(dadosResumo);
  XLSX.utils.book_append_sheet(wb, ws3, "Resumo Projetos");
  
  // Gerar o arquivo para download
  const wbout = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  const blob = new Blob([wbout], { type: 'application/octet-stream' });
  
  // Download do arquivo
  saveAs(blob, "resultado_rateio.xlsx");
};
