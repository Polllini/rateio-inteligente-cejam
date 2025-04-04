import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { toast } from "@/components/ui/use-toast";

// Classe para o projeto (igual ao código Python)
class Projeto {
  nome: string;
  limite_original: number;
  naturezas_nao_permitidas: string[];
  total_rateado: number;
  despesas_rateadas: Array<[string, string, number, string, number]>;
  ultrapassou_limite: boolean;
  pode_ultrapassar: boolean;
  percentual_limite: number;
  limite_ajustado: number;

  constructor(nome: string, limite: number, naturezas_nao_permitidas: string[], permite_ultrapassar: number) {
    this.nome = nome;
    this.limite_original = limite;
    this.naturezas_nao_permitidas = naturezas_nao_permitidas;
    this.total_rateado = 0;
    this.despesas_rateadas = [];
    this.ultrapassou_limite = false;

    // A nova flag: 0 = NÃO permite ultrapassar o teto; 1 = permite ultrapassar
    this.pode_ultrapassar = permite_ultrapassar === 1;

    // Gerar o percentual aleatório entre 98,45% e 99,92%
    this.percentual_limite = Math.random() * (0.9992 - 0.9845) + 0.9845;
    this.limite_ajustado = parseFloat((this.limite_original * this.percentual_limite).toFixed(2));
  }

  pode_participar_rateio(natureza_despesa: string): boolean {
    return !this.naturezas_nao_permitidas.includes(natureza_despesa);
  }

  ratear_despesa(
    valor: number, 
    natureza_despesa: string, 
    fornecedor: string, 
    titulo: string, 
    valor_titulo: number, 
    valor_rateado_titulo: number, 
    respeitar_limite: boolean = true
  ): number {
    // Garantir que o valor total rateado não ultrapasse o valor do título
    let valor_permitido = valor_titulo - valor_rateado_titulo;
    if (valor_permitido <= 0) {
      return 0; // Não pode ratear mais
    }

    // Arredondar o valor permitido para duas casas decimais
    valor_permitido = parseFloat(valor_permitido.toFixed(2));

    // Valor a ratear é o mínimo entre o valor solicitado e o valor permitido (para não ultrapassar o título)
    let valor_a_ratear = Math.min(valor, valor_permitido);

    // Se o projeto não permitir ultrapassar o teto ou se estivermos no modo de respeitar o limite, utiliza a capacidade restante
    let valor_ajustado;
    if (respeitar_limite || !this.pode_ultrapassar) {
      const capacidade = parseFloat((this.limite_ajustado - this.total_rateado).toFixed(2));
      valor_ajustado = Math.min(valor_a_ratear, capacidade);
    } else {
      // Caso o projeto permita ultrapassar e o modo seja de rateio extra, aloca o valor sem respeitar o teto
      valor_ajustado = valor_a_ratear;
      this.ultrapassou_limite = true;
    }

    valor_ajustado = parseFloat(valor_ajustado.toFixed(2));

    if (valor_ajustado > 0) {
      this.despesas_rateadas.push([fornecedor, natureza_despesa, valor_ajustado, titulo, valor_titulo]);
      this.total_rateado += valor_ajustado;
      this.total_rateado = parseFloat(this.total_rateado.toFixed(2));
      return valor_ajustado;
    }

    return 0;
  }
}

// Função para carregar projetos, limites de rateio e a flag de ultrapassar
export async function carregarProjetos(
  arquivoProjetos: ArrayBuffer,
  arquivoNaturezas: ArrayBuffer
): Promise<[Projeto[], any]> {
  // Carregar planilhas
  const wb_projetos = XLSX.read(new Uint8Array(arquivoProjetos), { type: 'array' });
  const wb_naturezas = XLSX.read(new Uint8Array(arquivoNaturezas), { type: 'array' });
  
  // Obter a primeira planilha
  const wsname_projetos = wb_projetos.SheetNames[0];
  const wsname_naturezas = wb_naturezas.SheetNames[0];
  
  const ws_projetos = wb_projetos.Sheets[wsname_projetos];
  const ws_naturezas = wb_naturezas.Sheets[wsname_naturezas];
  
  // Converter para JSON
  const df_projetos = XLSX.utils.sheet_to_json(ws_projetos);
  const df_naturezas = XLSX.utils.sheet_to_json(ws_naturezas);

  const projetos: Projeto[] = [];

  // Para cada projeto, adicionar suas naturezas não permitidas
  for (const row of df_projetos) {
    const nome_projeto = String(row['Nome do Projeto']);
    const limite = Number(row['Valor Teto']);
    // Nova coluna: "Limite" (0 ou 1) que indica se o projeto pode ultrapassar o teto permitido
    const permite_ultrapassar = Number(row['Limite']);  // Certifique-se de que esta coluna esteja na planilha

    // Naturezas não permitidas para o projeto
    const naturezas_projeto = (df_naturezas as any[])
      .filter(item => String(item['Nome do Projeto']) === nome_projeto)
      .map(item => String(item['Naturezas Não Permitidas']));

    // Criar o projeto com suas naturezas não permitidas e a flag de ultrapassar
    projetos.push(new Projeto(nome_projeto, limite, naturezas_projeto, permite_ultrapassar));
  }

  return [projetos, df_projetos];
}

// Função para carregar o arquivo de despesas
export function carregarDespesas(arquivoDespesas: ArrayBuffer): any[] {
  // Carregar planilha
  const wb = XLSX.read(new Uint8Array(arquivoDespesas), { type: 'array' });
  
  // Obter a primeira planilha
  const wsname = wb.SheetNames[0];
  const ws = wb.Sheets[wsname];
  
  // Converter para JSON
  const despesas = XLSX.utils.sheet_to_json(ws);
  
  return despesas.map((row: any) => ({
    'Nome Fornece': String(row['Nome Fornece']),
    'Natureza': String(row['Natureza']),
    'Valor': Number(row['Vlr.Titulo']),
    'No. Titulo': String(row['No. Titulo'])
  }));
}

// Função para distribuir as despesas entre todos os projetos elegíveis
export function distribuirDespesas(
  despesas: any[],
  projetos: Projeto[]
): Array<[string, string, number, string, string]> {
  // Ordenar os projetos por limite ajustado decrescente (para priorizar os com maior teto ajustado)
  const projetos_ordenados = [...projetos].sort((a, b) => b.limite_ajustado - a.limite_ajustado);

  const despesas_nao_alocadas: Array<[string, string, number, string, string]> = [];
  
  for (const row of despesas) {
    const natureza = row['Natureza'];
    const valor = parseFloat(Number(row['Valor']).toFixed(2));
    const fornecedor = row['Nome Fornece'];
    const titulo = row['No. Titulo'];
    let valor_restante = valor;
    let valor_rateado_titulo = 0;  // Valor já rateado para este título

    // Selecionar todos os projetos elegíveis para o rateio
    const projetos_elegiveis = projetos_ordenados.filter(p => p.pode_participar_rateio(natureza));

    if (projetos_elegiveis.length > 0) {
      // Dicionário para manter o controle da capacidade restante de cada projeto
      const projetos_com_capacidade = new Map<Projeto, number>();
      projetos_elegiveis.forEach(p => {
        projetos_com_capacidade.set(p, parseFloat((p.limite_ajustado - p.total_rateado).toFixed(2)));
      });

      // Loop para distribuir o valor restante enquanto houver projetos com capacidade
      while (valor_restante > 0 && projetos_com_capacidade.size > 0) {
        let total_capacidade = 0;
        projetos_com_capacidade.forEach(cap => { total_capacidade += cap; });

        // Evitar divisão por zero
        if (total_capacidade === 0) {
          break;
        }

        // Clonar o Map para iterar e modificar sem problemas
        const projetos_atuais = new Map(projetos_com_capacidade);
        
        for (const [projeto, capacidade_restante] of projetos_atuais) {
          // Calcular a proporção da capacidade do projeto em relação ao total
          const proporcao = total_capacidade > 0 ? capacidade_restante / total_capacidade : 0;

          // Calcular o valor a ratear para o projeto atual
          const valor_a_ratear = Math.min(
            parseFloat((valor_restante * proporcao).toFixed(2)),
            capacidade_restante,
            valor_restante
          );

          if (valor_a_ratear > 0) {
            const valor_rateado = projeto.ratear_despesa(
              valor_a_ratear, natureza, fornecedor, titulo, valor, valor_rateado_titulo
            );

            if (valor_rateado > 0) {
              valor_rateado_titulo += valor_rateado;
              valor_restante -= valor_rateado;
              valor_restante = parseFloat(valor_restante.toFixed(2));
              const nova_capacidade = projetos_com_capacidade.get(projeto)! - valor_rateado;
              projetos_com_capacidade.set(projeto, nova_capacidade);

              // Remover o projeto se não tiver mais capacidade
              if (nova_capacidade <= 0) {
                projetos_com_capacidade.delete(projeto);
              }
            } else {
              // Se valor_rateado for zero, remover o projeto
              projetos_com_capacidade.delete(projeto);
            }
          } else {
            // Remover o projeto se não puder mais receber alocações
            projetos_com_capacidade.delete(projeto);
          }
        }

        // Se não houver mais capacidade nos projetos, interromper o loop
        if (projetos_com_capacidade.size === 0) {
          break;
        }
      }

      // Se restar algum valor que não foi rateado, alocar rateio extra apenas em projetos que permitem ultrapassar o teto
      if (valor_restante > 0) {
        const projetos_extra = projetos_elegiveis
          .filter(p => p.pode_ultrapassar)
          .sort((a, b) => b.limite_ajustado - a.limite_ajustado);

        for (const projeto of projetos_extra) {
          const valor_rateado = projeto.ratear_despesa(
            valor_restante, natureza, fornecedor, titulo, valor, valor_rateado_titulo, false
          );

          if (valor_rateado > 0) {
            valor_rateado_titulo += valor_rateado;
            valor_restante -= valor_rateado;
            valor_restante = parseFloat(valor_restante.toFixed(2));

            if (valor_restante <= 0) {
              break;
            }
          }
        }
      }

      // Se ainda restar valor não alocado, adicionar às despesas não alocadas
      if (valor_restante > 0) {
        const justificativa = "Não foi possível alocar todo o valor";
        despesas_nao_alocadas.push([fornecedor, natureza, valor_restante, titulo, justificativa]);
      }
    } else {
      // Nenhum projeto elegível devido à natureza da despesa
      despesas_nao_alocadas.push([fornecedor, natureza, valor_restante, titulo, "Natureza não permitida"]);
    }
  }

  return despesas_nao_alocadas;
}

// Função para gerar a memória de cálculo em formato Excel e fazer o download
export function gerarMemoriaCalculo(
  projetos: Projeto[],
  despesas_nao_alocadas: Array<[string, string, number, string, string]>,
  df_projetos: any[]
): void {
  const dados: any[][] = [];
  for (const projeto of projetos) {
    for (const despesa of projeto.despesas_rateadas) {
      const [fornecedor, natureza, valor_rateado, titulo, valor_titulo] = despesa;
      dados.push([projeto.nome, fornecedor, natureza, valor_rateado, valor_titulo, titulo]);
    }
  }

  // Criar um DataFrame com as despesas rateadas
  const df_rateadas = dados.map(row => ({
    'Nome do Projeto': row[0],
    'Nome Fornece': row[1],
    'Natureza': row[2],
    'Valor Rateado': row[3],
    'Valor Titulo': row[4],
    'No. Titulo': row[5]
  }));

  // Despesas não alocadas
  const dados_nao_alocadas: any[][] = [];
  for (const despesa of despesas_nao_alocadas) {
    const [fornecedor, natureza, valor_restante, titulo, justificativa] = despesa;
    dados_nao_alocadas.push([fornecedor, natureza, valor_restante, titulo, justificativa]);
  }

  const df_nao_alocadas = dados_nao_alocadas.map(row => ({
    'Nome Fornece': row[0],
    'Natureza': row[1],
    'Valor Não Alocado': row[2],
    'No. Titulo': row[3],
    'Justificativa': row[4]
  }));

  // Preparar a terceira aba solicitada
  const resumo_dados: any[][] = [];
  const total_plano_trabalho = df_projetos.reduce((sum, row) => sum + Number(row['Valor Plano']), 0);

  for (const projeto of projetos) {
    const nome_projeto = projeto.nome;
    const projeto_rows = df_projetos.filter(row => String(row['Nome do Projeto']) === nome_projeto);
    
    if (projeto_rows.length > 0) {
      const valor_mensal_plano_trabalho = Number(projeto_rows[0]['Valor Plano']);
      const valor_corporativo_plano_trabalho = Number(projeto_rows[0]['Valor Teto']);
      
      const valor_rateado_mes = projeto.despesas_rateadas.reduce((sum, despesa) => sum + despesa[2], 0);
      const total_rateado = projetos.reduce((sum, p) => sum + p.despesas_rateadas.reduce((s, d) => s + d[2], 0), 0);

      // Cálculos para as colunas
      const percentual_do_plano = parseFloat(((valor_mensal_plano_trabalho / total_plano_trabalho) * 100).toFixed(2));
      const percentual_rateio_sobre_plano = valor_mensal_plano_trabalho > 0 
        ? parseFloat(((valor_corporativo_plano_trabalho / valor_mensal_plano_trabalho) * 100).toFixed(2)) 
        : 0;
      const percentual_assumido_rateio = total_rateado > 0 
        ? parseFloat(((valor_rateado_mes / total_rateado) * 100).toFixed(2)) 
        : 0;

      resumo_dados.push([
        nome_projeto,
        valor_mensal_plano_trabalho,
        percentual_do_plano,
        valor_corporativo_plano_trabalho,
        percentual_rateio_sobre_plano,
        valor_rateado_mes,
        percentual_assumido_rateio
      ]);
    }
  }

  const df_resumo_projetos = resumo_dados.map(row => ({
    'Nome do Projeto': row[0],
    'Valor Mensal do Plano de Trabalho': row[1],
    '% Do Plano': row[2],
    'Valor Corporativo em Plano de Trabalho': row[3],
    '% Rateio sobre Plano': row[4],
    'Valor Rateado no Mês': row[5],
    '% Assumido pelo Rateio no Mês': row[6]
  }));

  // Criar um novo workbook
  const wb = XLSX.utils.book_new();

  // Adicionar as planilhas
  const ws1 = XLSX.utils.json_to_sheet(df_rateadas);
  XLSX.utils.book_append_sheet(wb, ws1, 'Despesas Rateadas');

  const ws2 = XLSX.utils.json_to_sheet(df_nao_alocadas);
  XLSX.utils.book_append_sheet(wb, ws2, 'Despesas Não Alocadas');

  const ws3 = XLSX.utils.json_to_sheet(df_resumo_projetos);
  XLSX.utils.book_append_sheet(wb, ws3, 'Resumo Projetos');

  // Converter para um blob e fazer download
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { type: 'application/octet-stream' });
  
  saveAs(blob, 'despesas_rateadas_com_resumo.xlsx');
  
  toast({
    title: "Processamento concluído",
    description: "O arquivo foi gerado com sucesso!",
    duration: 5000,
  });
}

// Função principal para processar os arquivos e gerar o resultado
export async function processarRateio(
  arquivoProjetos: File,
  arquivoNaturezas: File,
  arquivoDespesas: File
): Promise<void> {
  try {
    // Carregar os arquivos
    const projetosBuffer = await arquivoProjetos.arrayBuffer();
    const naturezasBuffer = await arquivoNaturezas.arrayBuffer();
    const despesasBuffer = await arquivoDespesas.arrayBuffer();

    // Carregar projetos e naturezas
    const [projetos, df_projetos] = await carregarProjetos(projetosBuffer, naturezasBuffer);
    
    // Carregar despesas
    const despesas = carregarDespesas(despesasBuffer);
    
    // Distribuir as despesas
    const despesas_nao_alocadas = distribuirDespesas(despesas, projetos);
    
    // Gerar memória de cálculo e download
    gerarMemoriaCalculo(projetos, despesas_nao_alocadas, df_projetos as any[]);
    
    return Promise.resolve();
  } catch (error) {
    console.error("Erro ao processar os arquivos:", error);
    toast({
      title: "Erro no processamento",
      description: "Ocorreu um erro ao processar os arquivos. Verifique se estão no formato correto.",
      variant: "destructive",
      duration: 5000,
    });
    return Promise.reject(error);
  }
}
