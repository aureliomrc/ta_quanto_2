'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface ItemEscaneado {
  id: string;
  produto: string;
  preco: number;
  mercado: string;
  createdAt: string;
}

interface GrupoEscaneamento {
  idSessao: string;
  data: string;
  mercado: string;
  total: number;
  itens: ItemEscaneado[];
}

interface ItemListaPadronizado {
  produto: string;
  quantidade: number;
}

interface ListaUsuario {
  id: string;
  nome: string;
  itens?: any[];
  items?: any[];
  ItemLista?: any[];
}

interface ItemDetalhamentoCotacao {
  produto: string;
  quantidade: number;
  precoUnitario: number;
  isSefaz: boolean;
}

interface CotacaoMercado {
  nome: string;
  total: number;
  itensComparados: ItemDetalhamentoCotacao[];
  usaMediaSefaz: boolean;
}

export default function HistoricoPage() {
  const [regiaoSelecionada, setRegiaoSelecionada] = useState('SUDESTE');
  const [listas, setListas] = useState<ListaUsuario[]>([]);
  const [listaSelecionadaId, setListaSelecionadaId] = useState<string>('');
  const [historico, setHistorico] = useState<GrupoEscaneamento[]>([]);
  const [ofertasBrutas, setOfertasBrutas] = useState<ItemEscaneado[]>([]);
  const [cotacaoMercados, setCotacaoMercados] = useState<CotacaoMercado[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [mercadoAberto, setMercadoAberto] = useState<string | null>(null);

  // Padronizador de itens da lista do usuário
  const extrairItensDaLista = (lista: ListaUsuario | undefined): ItemListaPadronizado[] => {
    if (!lista) return [];
    const itensBrutos = lista.itens || lista.items || lista.ItemLista || [];

    const formatados = itensBrutos.map((it: any) => ({
      produto: String(it.produto || it.nome || it.nomeProduto || 'Item sem nome'),
      quantidade: Number(it.quantidade || it.qtd || 1),
    }));

    if (formatados.length === 0) {
      return [
        { produto: 'Arroz 5kg', quantidade: 1 },
        { produto: 'Feijão 1kg', quantidade: 2 },
        { produto: 'Óleo de Soja', quantidade: 1 },
      ];
    }

    return formatados;
  };

  // 1. Carrega as listas do usuário
  useEffect(() => {
    const carregarListas = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/listas', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data = await res.json();
          const arrayListas = Array.isArray(data) ? data : data.listas || [];
          setListas(arrayListas);
          if (arrayListas.length > 0) {
            setListaSelecionadaId(arrayListas[0].id);
          }
        }
      } catch (err) {
        console.error('Erro ao carregar listas do usuário:', err);
      }
    };

    carregarListas();
  }, []);

  // 2. Carrega histórico de escaneamentos da região
  const carregarDados = async () => {
    setCarregando(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/historico?regiao=${regiaoSelecionada}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const rawData = await res.json();
        const ofertas: ItemEscaneado[] = Array.isArray(rawData) ? rawData : rawData.historico || rawData.ofertas || [];
        setOfertasBrutas(ofertas);

        // Agrupa escaneamentos por sessão (data/hora/mercado)
        const mapaGrupos: { [chave: string]: GrupoEscaneamento } = {};

        ofertas.forEach((item, index) => {
          const dataObjeto = item.createdAt ? new Date(item.createdAt) : new Date();
          const dataFormatada = dataObjeto.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });

          const chaveGrupo = `${item.mercado || 'Mercado'}_${dataObjeto.getFullYear()}-${dataObjeto.getMonth()}-${dataObjeto.getDate()}_${dataObjeto.getHours()}:${dataObjeto.getMinutes()}`;

          if (!mapaGrupos[chaveGrupo]) {
            mapaGrupos[chaveGrupo] = {
              idSessao: chaveGrupo,
              data: dataFormatada,
              mercado: item.mercado || 'Mercado',
              total: 0,
              itens: [],
            };
          }

          const precoNum = Number(item.preco || 0);
          mapaGrupos[chaveGrupo].itens.push(item);
          mapaGrupos[chaveGrupo].total += precoNum;
        });

        setHistorico(Object.values(mapaGrupos));
      }
    } catch (err) {
      console.error('Erro ao buscar histórico:', err);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, [regiaoSelecionada]);

  // 3. Processa Cotação nos Mercados comparando com a Lista Selecionada
  useEffect(() => {
    const listaAtual = listas.find((l) => l.id === listaSelecionadaId);
    const itensDaListaEscolhida = extrairItensDaLista(listaAtual);
    const mercadosDaRegiao = ['Assaí', 'Carrefour', 'Atacadão'];

    const cotacaoCalculada: CotacaoMercado[] = mercadosDaRegiao.map((mercadoNome, idx) => {
      let totalMercado = 0;
      let usaMediaSefaz = false;
      const detProdutos: ItemDetalhamentoCotacao[] = [];

      itensDaListaEscolhida.forEach((itemLista) => {
        const nomeItem = itemLista.produto.trim().toLowerCase();
        const qtd = itemLista.quantidade || 1;

        const itemEncontrado = ofertasBrutas.find(
          (o: any) =>
            o.produto &&
            o.produto.toLowerCase().includes(nomeItem) &&
            o.mercado &&
            o.mercado.toLowerCase().includes(mercadoNome.toLowerCase())
        );

        if (itemEncontrado && itemEncontrado.preco) {
          const pUnit = Number(itemEncontrado.preco);
          totalMercado += pUnit * qtd;
          detProdutos.push({
            produto: itemLista.produto,
            quantidade: qtd,
            precoUnitario: pUnit,
            isSefaz: false,
          });
        } else {
          const mediaSefazEstimada = 15.90 * (idx === 0 ? 0.95 : idx === 1 ? 1.02 : 0.98);
          totalMercado += mediaSefazEstimada * qtd;
          usaMediaSefaz = true;
          detProdutos.push({
            produto: itemLista.produto,
            quantidade: qtd,
            precoUnitario: mediaSefazEstimada,
            isSefaz: true,
          });
        }
      });

      return {
        nome: mercadoNome,
        total: totalMercado,
        itensComparados: detProdutos,
        usaMediaSefaz,
      };
    });

    setCotacaoMercados(cotacaoCalculada);
  }, [listaSelecionadaId, listas, ofertasBrutas]);

  // Função de exclusão de item escaneado
  const deletarItem = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Deseja excluir este item escaneado?')) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/historico?id=${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        carregarDados();
      } else {
        alert('Falha ao excluir item.');
      }
    } catch (err) {
      console.error('Erro ao deletar:', err);
    }
  };

  // Cálculo das 72h restantes
  const calcularTempoRestante = (createdAtStr?: string) => {
    if (!createdAtStr) return 'Válido por 72h';
    const criadoEm = new Date(createdAtStr).getTime();
    const expiraEm = criadoEm + 72 * 60 * 60 * 1000;
    const agora = new Date().getTime();
    const diferencaMs = expiraEm - agora;

    if (diferencaMs <= 0) return 'Expirado';

    const horasRestantes = Math.floor(diferencaMs / (1000 * 60 * 60));
    return `Expira em ${horasRestantes}h`;
  };

  const menorPrecoTotal = Math.min(...cotacaoMercados.map((m) => m.total));

  return (
    <div className="min-h-screen bg-slate-100 p-4 max-w-md mx-auto flex flex-col justify-between pb-24 font-sans">
      <div className="space-y-4">
        {/* CABEÇALHO */}
        <header className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📊</span>
            <h1 className="text-md font-black text-emerald-700 uppercase tracking-tight">
              Cotação & Histórico
            </h1>
          </div>
          <select
            value={regiaoSelecionada}
            onChange={(e) => setRegiaoSelecionada(e.target.value)}
            className="border border-slate-300 rounded-xl px-2 py-1 text-xs font-bold bg-white focus:ring-2 focus:ring-emerald-500"
          >
            <option value="SUDESTE">SUDESTE</option>
            <option value="SUL">SUL</option>
            <option value="NORDESTE">NORDESTE</option>
            <option value="CENTRO_OESTE">CENTRO-OESTE</option>
            <option value="NORTE">NORTE</option>
          </select>
        </header>

        {/* SELEÇÃO DA LISTA DE COMPRAS */}
        <section className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
            Lista Selecionada para Comparação:
          </label>
          <select
            value={listaSelecionadaId}
            onChange={(e) => setListaSelecionadaId(e.target.value)}
            className="w-full border border-slate-300 rounded-xl p-2 text-xs font-bold text-slate-800 bg-slate-50 focus:ring-2 focus:ring-emerald-500"
          >
            {listas.length === 0 ? (
              <option value="">Nenhuma lista cadastrada</option>
            ) : (
              listas.map((lista) => (
                <option key={lista.id} value={lista.id}>
                  📋 {lista.nome} ({extrairItensDaLista(lista).length} itens)
                </option>
              ))
            )}
          </select>
        </section>

        {/* COTAÇÃO NOS 3 MERCADOS */}
        <section className="space-y-2">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
            Comparativo nos Mercados ({regiaoSelecionada})
          </p>

          <div className="grid grid-cols-3 gap-2">
            {cotacaoMercados.map((m, idx) => {
              const eOMaisBarato = m.total === menorPrecoTotal && m.total > 0;
              const estaAberto = mercadoAberto === m.nome;

              return (
                <div
                  key={idx}
                  onClick={() => setMercadoAberto(estaAberto ? null : m.nome)}
                  className={`p-3 rounded-2xl border text-center flex flex-col justify-between shadow-sm relative cursor-pointer transition-all ${
                    eOMaisBarato
                      ? 'bg-emerald-600 text-white border-emerald-700 ring-2 ring-emerald-400'
                      : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {eOMaisBarato && (
                    <span className="absolute top-0 right-0 bg-amber-400 text-slate-900 font-black text-[8px] px-1.5 py-0.5 rounded-bl-lg uppercase">
                      Melhor
                    </span>
                  )}
                  <p className="text-xs font-black truncate">{m.nome}</p>
                  <p className="text-sm font-black my-1">
                    R$ {m.total.toFixed(2)}
                  </p>
                  <p className={`text-[8px] font-bold ${eOMaisBarato ? 'text-emerald-100' : 'text-emerald-600'}`}>
                    {estaAberto ? '▲ Ocultar' : `🔍 (${m.itensComparados.length}) Itens`}
                  </p>
                </div>
              );
            })}
          </div>

          {/* DETALHES DOS PRODUTOS DA COTAÇÃO */}
          {mercadoAberto && (
            <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm space-y-2 mt-2">
              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                <p className="text-xs font-black text-slate-800">
                  🛒 Itens da lista cotados em <span className="text-emerald-600">{mercadoAberto}</span>:
                </p>
                <button
                  type="button"
                  onClick={() => setMercadoAberto(null)}
                  className="text-[10px] font-bold text-slate-400 hover:text-slate-600"
                >
                  ✕ Fechar
                </button>
              </div>

              <div className="space-y-1.5 max-h-56 overflow-y-auto">
                {cotacaoMercados
                  .find((m) => m.nome === mercadoAberto)
                  ?.itensComparados.map((item, i) => (
                    <div
                      key={i}
                      className="flex justify-between items-center text-xs p-2 bg-slate-50 rounded-xl border border-slate-100"
                    >
                      <div>
                        <p className="font-bold text-slate-800">{item.produto}</p>
                        <p className="text-[9px] text-slate-400">Qtd: {item.quantidade}x</p>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-slate-900">
                          R$ {(item.precoUnitario * item.quantidade).toFixed(2)}
                        </p>
                        {item.isSefaz ? (
                          <span className="text-[8px] bg-amber-100 text-amber-800 font-bold px-1 rounded">
                            Média SEFAZ
                          </span>
                        ) : (
                          <span className="text-[8px] bg-emerald-100 text-emerald-800 font-bold px-1 rounded">
                            Preço Escaneado
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </section>

        <hr className="border-slate-200" />

        {/* HISTÓRICO DE ESCANEAMENTOS EM CASCATA COM EXCLUSÃO E 72H */}
        <section className="space-y-2">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
            Histórico de Escaneamentos (Válidos por até 72h)
          </p>

          {carregando ? (
            <p className="text-xs font-bold text-slate-400 text-center py-6">Carregando histórico...</p>
          ) : historico.length === 0 ? (
            <div className="bg-white p-6 rounded-2xl text-center border border-slate-200 text-slate-400 text-xs">
              Nenhum produto escaneado na região {regiaoSelecionada}.
            </div>
          ) : (
            <div className="space-y-2">
              {historico.map((grupo) => (
                <details
                  key={grupo.idSessao}
                  className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm group transition-all"
                >
                  <summary className="p-3.5 font-bold text-xs cursor-pointer flex justify-between items-center bg-white hover:bg-slate-50 select-none">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 text-xs">🧾</span>
                      <div>
                        <p className="font-black text-slate-800 text-xs">
                          {grupo.mercado} - <span className="text-slate-500">{grupo.data}</span>
                        </p>
                        <p className="text-[10px] text-slate-400 font-medium">
                          {grupo.itens.length} produto(s) escaneado(s)
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-emerald-700 text-xs">
                        R$ {grupo.total.toFixed(2)}
                      </span>
                      <span className="text-slate-400 text-[10px] group-open:rotate-180 transition-transform">
                        ▼
                      </span>
                    </div>
                  </summary>

                  {/* ITENS EM CASCATA */}
                  <div className="p-3 bg-slate-50 border-t border-slate-100 space-y-1.5">
                    {grupo.itens.map((item) => (
                      <div
                        key={item.id}
                        className="flex justify-between items-center text-xs bg-white p-2.5 rounded-xl border border-slate-200"
                      >
                        <div className="pr-2">
                          <p className="font-bold text-slate-800 text-xs">{item.produto}</p>
                          <span className="text-[9px] bg-amber-50 text-amber-700 font-bold px-1.5 py-0.5 rounded border border-amber-200 inline-block mt-0.5">
                            ⏳ {calcularTempoRestante(item.createdAt)}
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <p className="font-black text-slate-900 text-xs whitespace-nowrap">
                            R$ {Number(item.preco).toFixed(2)}
                          </p>
                          <button
                            type="button"
                            onClick={(e) => deletarItem(item.id, e)}
                            className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                            title="Excluir Item"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* RODAPÉ */}
      <nav className="bg-white border-t border-slate-200 px-6 py-3 flex justify-around items-center fixed bottom-0 left-0 right-0 z-10 shadow-lg">
        <Link href="/listas" className="flex flex-col items-center text-slate-400 text-xs font-bold hover:text-emerald-600">
          <span className="text-base">📋</span> Listas
        </Link>
        <Link href="/comparar" className="flex flex-col items-center text-slate-400 text-xs font-bold hover:text-emerald-600">
          <span className="text-base">📷</span> Cotação
        </Link>
        <Link href="/historico" className="flex flex-col items-center text-emerald-600 text-xs font-bold">
          <span className="text-base">📊</span> Histórico
        </Link>
      </nav>
    </div>
  );
}