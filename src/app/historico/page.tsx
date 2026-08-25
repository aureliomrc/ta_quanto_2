'use client';

import React, { useState, useMemo } from 'react';
import { 
  Trophy, 
  Store, 
  ShoppingCart, 
  TrendingDown, 
  AlertCircle, 
  CheckCircle2, 
  HelpCircle, 
  Calendar, 
  ChevronRight,
  Sparkles,
  Info,
  DollarSign
} from 'lucide-react';

// Tipos de dados
interface ItemEscaneado {
  id: string;
  nome: string;
  quantidade: number;
  categoria: string;
}

interface PrecoMercado {
  mercadoNome: string;
  preco: number | null; // null se não estiver no folheto
  emPromocao?: boolean;
}

interface ItemComPrecos extends ItemEscaneado {
  precosMercados: { [key: string]: number };
  usouSefaz: { [key: string]: boolean };
  precoMedioSefaz: number;
}

interface RankingMercado {
  posicao: number;
  nome: string;
  totalLista: number;
  qtdFolheto: number;
  qtdSefaz: number;
  diferencaParaMelhor: number;
  percentualEconomia: number;
}

interface HistoricoEscaneamento {
  id: string;
  data: string;
  nomeLista: string;
  totalItens: number;
  itens: ItemEscaneado[];
}

// Dados simulados de histórico de escaneamentos
const HISTORICO_MOCK: HistoricoEscaneamento[] = [
  {
    id: 'hist-1',
    data: '25/08/2026 - 14:30',
    nomeLista: 'Compra Semanal de Supermercado',
    totalItens: 6,
    itens: [
      { id: '1', nome: 'Arroz Agulhinha Tipo 1 5kg', quantidade: 1, categoria: 'Mercearia' },
      { id: '2', nome: 'Feijão Carioca 1kg', quantidade: 2, categoria: 'Mercearia' },
      { id: '3', nome: 'Óleo de Soja 900ml', quantidade: 2, categoria: 'Mercearia' },
      { id: '4', nome: 'Leite Integral 1L', quantidade: 6, categoria: 'Laticínios' },
      { id: '5', nome: 'Café Torrado e Moído 500g', quantidade: 2, categoria: 'Mercearia' },
      { id: '6', nome: 'Detergente Líquido 500ml', quantidade: 4, categoria: 'Limpeza' },
    ]
  },
  {
    id: 'hist-2',
    data: '18/08/2026 - 10:15',
    nomeLista: 'Churrasco de Fim de Semana',
    totalItens: 4,
    itens: [
      { id: '10', nome: 'Picanha Bovina kg', quantidade: 2, categoria: 'Açougue' },
      { id: '11', nome: 'Cerveja Pilsen Lata 350ml', quantidade: 12, categoria: 'Bebidas' },
      { id: '12', nome: 'Carvão Vegetal 3kg', quantidade: 1, categoria: 'Outros' },
      { id: '13', nome: 'Linguiça Toscânia kg', quantidade: 1.5, categoria: 'Açougue' },
    ]
  }
];

// Dados simulados de folhetos/encartes por mercado
const PRECOS_FOLHETOS: { [produtoNome: string]: { [mercado: string]: number } } = {
  'Arroz Agulhinha Tipo 1 5kg': { 'Atacadão': 21.90, 'Assaí': 22.50, 'Carrefour': 25.90 },
  'Feijão Carioca 1kg': { 'Atacadão': 6.80, 'Assaí': 6.90, 'Pão de Açúcar': 8.50 },
  'Óleo de Soja 900ml': { 'Atacadão': 5.49, 'Carrefour': 5.99, 'Pão de Açúcar': 6.20 },
  'Leite Integral 1L': { 'Assaí': 4.29, 'Carrefour': 4.59 },
  'Café Torrado e Moído 500g': { 'Atacadão': 14.90, 'Assaí': 15.20, 'Carrefour': 16.80 },
  // Detergente Líquido não está em nenhum folheto -> acionará SEFAZ
};

// Médias de Preços da SEFAZ (fallback)
const MEDIAS_SEFAZ: { [produtoNome: string]: number } = {
  'Arroz Agulhinha Tipo 1 5kg': 23.80,
  'Feijão Carioca 1kg': 7.40,
  'Óleo de Soja 900ml': 5.85,
  'Leite Integral 1L': 4.60,
  'Café Torrado e Moído 500g': 15.90,
  'Detergente Líquido 500ml': 2.45,
  'Picanha Bovina kg': 69.90,
  'Cerveja Pilsen Lata 350ml': 3.89,
  'Carvão Vegetal 3kg': 18.50,
  'Linguiça Toscânia kg': 21.90
};

const MERCADOS_DISPONIVEIS = ['Atacadão', 'Assaí', 'Carrefour', 'Pão de Açúcar'];

export default function HistoricoComparativoPage() {
  const [listaSelecionadaId, setListaSelecionadaId] = useState<string>(HISTORICO_MOCK[0].id);
  const [filtroOrigem, setFiltroOrigem] = useState<'todos' | 'folheto' | 'sefaz'>('todos');

  const listaAtual = useMemo(() => {
    return HISTORICO_MOCK.find(h => h.id === listaSelecionadaId) || HISTORICO_MOCK[0];
  }, [listaSelecionadaId]);

  // Processa os itens calculando preços por mercado e identificando fallback da SEFAZ
  const { itensProcessados, rankingMercados } = useMemo(() => {
    const processados: ItemComPrecos[] = listaAtual.itens.map(item => {
      const precosMercados: { [key: string]: number } = {};
      const usouSefaz: { [key: string]: boolean } = {};
      const precoMedioSefaz = MEDIAS_SEFAZ[item.nome] || 10.00; // Valor padrão caso não tenha na SEFAZ

      MERCADOS_DISPONIVEIS.forEach(mercado => {
        const precoFolheto = PRECOS_FOLHETOS[item.nome]?.[mercado];
        if (precoFolheto !== undefined) {
          precosMercados[mercado] = precoFolheto;
          usouSefaz[mercado] = false;
        } else {
          // Fallback: Média de preços da SEFAZ
          precosMercados[mercado] = precoMedioSefaz;
          usouSefaz[mercado] = true;
        }
      });

      return {
        ...item,
        precosMercados,
        usouSefaz,
        precoMedioSefaz,
      };
    });

    // Calcula total por mercado e gera ranking
    const totaisMercados = MERCADOS_DISPONIVEIS.map(mercado => {
      let totalLista = 0;
      let qtdFolheto = 0;
      let qtdSefaz = 0;

      processados.forEach(item => {
        const precoUnitario = item.precosMercados[mercado];
        totalLista += precoUnitario * item.quantidade;

        if (item.usouSefaz[mercado]) {
          qtdSefaz++;
        } else {
          qtdFolheto++;
        }
      });

      return {
        nome: mercado,
        totalLista,
        qtdFolheto,
        qtdSefaz,
      };
    });

    // Ordena do menor valor para o maior
    totaisMercados.sort((a, b) => a.totalLista - b.totalLista);

    const menorValor = totaisMercados[0].totalLista;
    const maiorValor = totaisMercados[totaisMercados.length - 1].totalLista;

    const ranking: RankingMercado[] = totaisMercados.map((m, index) => {
      const diferencaParaMelhor = m.totalLista - menorValor;
      const percentualEconomia = maiorValor > 0 
        ? ((maiorValor - m.totalLista) / maiorValor) * 100 
        : 0;

      return {
        posicao: index + 1,
        nome: m.nome,
        totalLista: m.totalLista,
        qtdFolheto: m.qtdFolheto,
        qtdSefaz: m.qtdSefaz,
        diferencaParaMelhor,
        percentualEconomia,
      };
    });

    return { itensProcessados: processados, rankingMercados: ranking };
  }, [listaAtual]);

  const mercadoCampeao = rankingMercados[0];
  const mercadoMaisCaro = rankingMercados[rankingMercados.length - 1];
  const economiaMaxima = mercadoMaisCaro.totalLista - mercadoCampeao.totalLista;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-800">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Cabeçalho da Página */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
              <ShoppingCart className="w-8 h-8 text-indigo-600" />
              Histórico & Comparativo de Mercados
            </h1>
            <p className="text-slate-500 mt-1">
              Análise inteligente de preços com base nos seus itens escaneados, folhetos e banco de dados da SEFAZ.
            </p>
          </div>

          {/* Seletor de Listas do Histórico */}
          <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
            <Calendar className="w-5 h-5 text-indigo-500 ml-2" />
            <select
              value={listaSelecionadaId}
              onChange={(e) => setListaSelecionadaId(e.target.value)}
              className="bg-transparent font-semibold text-slate-700 outline-none cursor-pointer pr-4"
            >
              {HISTORICO_MOCK.map((hist) => (
                <option key={hist.id} value={hist.id}>
                  {hist.nomeLista} ({hist.data})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Banner do Campeão de Economia */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
          <div className="absolute -right-6 -bottom-6 opacity-15 pointer-events-none">
            <Trophy className="w-64 h-64" />
          </div>

          <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            <div className="md:col-span-2 space-y-2">
              <div className="inline-flex items-center gap-2 bg-emerald-500/30 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-emerald-100 backdrop-blur-sm">
                <Sparkles className="w-4 h-4" />
                Melhor Opção Encontrada
              </div>
              <h2 className="text-2xl md:text-3xl font-extrabold">
                {mercadoCampeao.nome} é o lugar mais barato!
              </h2>
              <p className="text-emerald-100 text-sm md:text-base max-w-xl">
                Comprando toda a sua lista neste estabelecimento, você economiza até{' '}
                <strong className="text-white underline decoration-emerald-300">
                  R$ {economiaMaxima.toFixed(2)}
                </strong>{' '}
                em comparação ao mercado mais caro.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 text-center space-y-1">
              <span className="text-xs uppercase tracking-wider text-emerald-200">Total da Lista</span>
              <div className="text-3xl font-black text-white">
                R$ {mercadoCampeao.totalLista.toFixed(2)}
              </div>
              <div className="text-xs text-emerald-200 flex items-center justify-center gap-1 mt-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                {mercadoCampeao.qtdFolheto} em oferta no encarte
              </div>
            </div>
          </div>
        </div>

        {/* Ranking de Mercados */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              Ranking de Mercados para esta Lista
            </h2>
            <span className="text-xs text-slate-500">
              Ordenado do menor preço total para o maior
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {rankingMercados.map((m) => {
              const isPrimeiro = m.posicao === 1;
              return (
                <div
                  key={m.nome}
                  className={`bg-white rounded-xl p-5 border transition-all duration-200 relative flex flex-col justify-between ${
                    isPrimeiro
                      ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-md'
                      : 'border-slate-200 hover:border-slate-300 shadow-sm'
                  }`}
                >
                  {/* Badge de Posição */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                    <span
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                        isPrimeiro
                          ? 'bg-amber-400 text-slate-900'
                          : m.posicao === 2
                          ? 'bg-slate-300 text-slate-800'
                          : m.posicao === 3
                          ? 'bg-amber-700/20 text-amber-900'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      #{m.posicao}
                    </span>
                    <span className="font-bold text-slate-800">{m.nome}</span>
                  </div>

                  {/* Valor Total */}
                  <div className="space-y-1 mb-4">
                    <div className="text-xs text-slate-400 font-medium">Total Estimado</div>
                    <div className="text-2xl font-black text-slate-900">
                      R$ {m.totalLista.toFixed(2)}
                    </div>
                    {m.diferencaParaMelhor > 0 ? (
                      <div className="text-xs text-rose-500 font-semibold flex items-center gap-1">
                        + R$ {m.diferencaParaMelhor.toFixed(2)} mais caro
                      </div>
                    ) : (
                      <div className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                        <TrendingDown className="w-3.5 h-3.5" /> Menor valor
                      </div>
                    )}
                  </div>

                  {/* Fontes de Preços (Folheto vs SEFAZ) */}
                  <div className="space-y-2 pt-3 border-t border-slate-100 text-xs">
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="flex items-center gap-1 text-indigo-600 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Preços do Folheto:
                      </span>
                      <strong className="text-slate-800">{m.qtdFolheto} itens</strong>
                    </div>
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="flex items-center gap-1 text-amber-600 font-medium">
                        <Info className="w-3.5 h-3.5" /> Média SEFAZ:
                      </span>
                      <strong className="text-slate-800">{m.qtdSefaz} itens</strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Aviso Explicativo da SEFAZ */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 text-amber-900 text-sm">
          <HelpCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <strong className="font-bold text-amber-950 block">Como funciona o cálculo de preços?</strong>
            <p className="text-amber-800/90 leading-relaxed">
              Priorizamos os valores vigentes dos <strong>folhetos e encartes de promoções</strong> dos mercados. Caso um produto da sua lista não esteja anunciado no encarte oficial do estabelecimento, utilizamos a <strong>média histórica de notas fiscais (SEFAZ)</strong> para garantir que o cálculo total da sua compra seja o mais preciso possível.
            </p>
          </div>
        </div>

        {/* Tabela Detalhada de Comparação de Itens */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden space-y-4 p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Detalhamento Item por Item
              </h3>
              <p className="text-xs text-slate-500">
                Compare os valores individuais aplicados em cada supermercado
              </p>
            </div>

            {/* Filtros da Tabela */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Exibir:</span>
              <div className="bg-slate-100 p-1 rounded-lg flex gap-1">
                <button
                  onClick={() => setFiltroOrigem('todos')}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                    filtroOrigem === 'todos'
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Todos ({itensProcessados.length})
                </button>
                <button
                  onClick={() => setFiltroOrigem('folheto')}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                    filtroOrigem === 'folheto'
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Em Oferta (Folheto)
                </button>
                <button
                  onClick={() => setFiltroOrigem('sefaz')}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                    filtroOrigem === 'sefaz'
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Média SEFAZ
                </button>
              </div>
            </div>
          </div>

          {/* Tabela Responsiva */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Produto</th>
                  <th className="py-3 px-4 text-center">Qtd</th>
                  <th className="py-3 px-4 text-center">Média SEFAZ</th>
                  {MERCADOS_DISPONIVEIS.map(mercado => (
                    <th key={mercado} className="py-3 px-4 text-right">
                      {mercado}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {itensProcessados.map(item => {
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Nome do Produto */}
                      <td className="py-3.5 px-4 font-semibold text-slate-800">
                        <div>{item.nome}</div>
                        <span className="text-[11px] font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full inline-block mt-0.5">
                          {item.categoria}
                        </span>
                      </td>

                      {/* Quantidade */}
                      <td className="py-3.5 px-4 text-center font-bold text-slate-600">
                        {item.quantidade}x
                      </td>

                      {/* Valor Médio SEFAZ */}
                      <td className="py-3.5 px-4 text-center text-slate-500 text-xs font-mono">
                        R$ {item.precoMedioSefaz.toFixed(2)}
                      </td>

                      {/* Colunas por Mercado */}
                      {MERCADOS_DISPONIVEIS.map(mercado => {
                        const precoUnitario = item.precosMercados[mercado];
                        const foiSefaz = item.usouSefaz[mercado];
                        const totalItem = precoUnitario * item.quantidade;

                        // Encontra o menor preço deste item entre todos os mercados
                        const menorPrecoItem = Math.min(...Object.values(item.precosMercados));
                        const isMenorPreco = precoUnitario === menorPrecoItem;

                        return (
                          <td key={mercado} className="py-3.5 px-4 text-right">
                            <div className="flex flex-col items-end">
                              <span
                                className={`font-bold font-mono ${
                                  isMenorPreco ? 'text-emerald-600' : 'text-slate-700'
                                }`}
                              >
                                R$ {totalItem.toFixed(2)}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                ({item.quantidade}x R$ {precoUnitario.toFixed(2)})
                              </span>

                              {/* Tag indicadora de Origem do Preço */}
                              {foiSefaz ? (
                                <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-amber-700 bg-amber-100/80 px-1.5 py-0.5 rounded mt-1">
                                  <Info className="w-2.5 h-2.5" /> SEFAZ
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-indigo-700 bg-indigo-100/80 px-1.5 py-0.5 rounded mt-1">
                                  <CheckCircle2 className="w-2.5 h-2.5" /> Folheto
                                </span>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
```eof

A tela de Histórico foi atualizada com todas as funcionalidades solicitadas:

1. **Ranking Automático de Mercados:** Exibe o supermercado onde a lista completa sai mais barata, indicando a economia total obtida.
2. **Comparativo em Tabela:** Detalhamento do valor unitário e total por item escaneado em cada estabelecimento.
3. **Média de Preços SEFAZ (Fallback):** Quando um item da lista não consta nas ofertas/folhetos do mercado, o sistema utiliza a média de notas fiscais da SEFAZ e marca com uma etiqueta indicativa (`Média SEFAZ`).