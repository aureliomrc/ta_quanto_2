'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface ListaItem {
  id: string;
  nome: string;
}

export default function CompararPage() {
  const [listas, setListas] = useState<ListaItem[]>([]);
  const [listaSelecionada, setListaSelecionada] = useState('');
  const [regiao, setRegiao] = useState('SUDESTE');
  const [carregando, setCarregando] = useState(false);
  const [resultado, setResultado] = useState<any>(null);
  const [erro, setErro] = useState('');

  // Estado para controlar qual card de mercado está expandido
  const [mercadoExpandido, setMercadoExpandido] = useState<string | null>(null);

  useEffect(() => {
    const buscarListas = async () => {
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
            setListaSelecionada(arrayListas[0].id);
          }
        }
      } catch (err) {
        console.error('Erro ao buscar listas:', err);
      }
    };

    buscarListas();
  }, []);

  const handleComparar = async () => {
    setCarregando(true);
    setErro('');
    setMercadoExpandido(null);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/comparador', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ listaId: listaSelecionada, regiao }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao realizar comparação.');

      setResultado(data);
    } catch (err: any) {
      setErro(err.message);
    } finally {
      setCarregando(false);
    }
  };

  const toggleMercado = (nomeMercado: string) => {
    if (mercadoExpandido === nomeMercado) {
      setMercadoExpandido(null);
    } else {
      setMercadoExpandido(nomeMercado);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 max-w-md mx-auto flex flex-col justify-between pb-24 font-sans">
      <div className="space-y-4">
        <header className="flex items-center gap-2 border-b border-slate-200 pb-3">
          <span className="text-2xl">📊</span>
          <h1 className="text-lg font-black text-emerald-700 uppercase tracking-tight">
            Cotação & Comparação
          </h1>
        </header>

        {/* Formulário de Seleção */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3 shadow-sm">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Selecione a Lista</label>
            <select
              value={listaSelecionada}
              onChange={(e) => setListaSelecionada(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              {listas.length === 0 ? (
                <option value="">Nenhuma lista encontrada</option>
              ) : (
                listas.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.nome}
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Sua Região</label>
            <select
              value={regiao}
              onChange={(e) => setRegiao(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              <option value="SUDESTE">Sudeste</option>
              <option value="SUL">Sul</option>
              <option value="NORDESTE">Nordeste</option>
              <option value="CENTRO_OESTE">Centro-Oeste</option>
              <option value="NORTE">Norte</option>
            </select>
          </div>

          <button
            type="button"
            onClick={handleComparar}
            disabled={carregando}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl text-xs active:scale-95 transition-all disabled:opacity-50"
          >
            {carregando ? 'Calculando Preços...' : 'Comparar 3 Mercados'}
          </button>
        </div>

        {erro && (
          <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs font-bold border border-red-200">
            {erro}
          </div>
        )}

        {/* Cards dos Mercados com Lista Interna Incorporada */}
        {resultado && (
          <div className="space-y-3 pt-2">
            <h2 className="text-xs font-black text-slate-500 uppercase">Ranking dos Mercados</h2>

            <div className="space-y-3">
              {resultado.totais?.slice(0, 3).map((t: any, idx: number) => {
                const isExpanded = mercadoExpandido === t.mercado;

                return (
                  <div
                    key={idx}
                    className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm transition-all"
                  >
                    {/* Cabeçalho do Card */}
                    <div className="p-4 flex justify-between items-center bg-white">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                          #{idx + 1} Opção
                        </span>
                        <h3 className="text-sm font-black text-slate-800 mt-1">{t.mercado}</h3>
                      </div>

                      <div className="text-right">
                        <p className="text-xs font-bold text-slate-400">Total Estimado</p>
                        <p className="text-base font-black text-emerald-700">R$ {t.total.toFixed(2)}</p>
                      </div>
                    </div>

                    {/* Botão de Expansão/Visualização */}
                    <button
                      type="button"
                      onClick={() => toggleMercado(t.mercado)}
                      className="w-full py-2 px-4 bg-slate-50 border-t border-slate-100 text-slate-600 font-bold text-[11px] flex justify-between items-center hover:bg-slate-100 transition-colors"
                    >
                      <span>{isExpanded ? 'Ocultar Produtos' : 'Ver Produtos'}</span>
                      <span className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                        ▼
                      </span>
                    </button>

                    {/* Lista Interna do Mercado */}
                    {isExpanded && (
                      <div className="p-3 bg-slate-50/50 border-t border-slate-100 space-y-2">
                        {resultado.itens?.map((item: any, itemIdx: number) => {
                          const ofertaDoMercado = item.ofertas.find(
                            (of: any) => of.mercado === t.mercado
                          ) || item.ofertas[idx] || item.ofertas[0];

                          return (
                            <div
                              key={itemIdx}
                              className="bg-white p-2.5 rounded-xl border border-slate-100 flex justify-between items-center text-xs shadow-2xs"
                            >
                              <div>
                                <p className="font-bold text-slate-800">
                                  {item.produto}{' '}
                                  <span className="text-slate-400 font-normal">(x{item.quantidade})</span>
                                </p>
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold">
                                  {ofertaDoMercado?.mensagem || 'Média SEFAZ'}
                                </span>
                              </div>

                              <div className="text-right">
                                <p className="font-black text-slate-900">
                                  R$ {((ofertaDoMercado?.preco || 0) * item.quantidade).toFixed(2)}
                                </p>
                                <p className="text-[9px] text-slate-400">
                                  Un: R$ {(ofertaDoMercado?.preco || 0).toFixed(2)}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Menu Fixo do Rodapé */}
      <nav className="bg-white border-t border-slate-200 px-6 py-3 flex justify-around items-center fixed bottom-0 left-0 right-0 z-10 shadow-lg">
        <Link
          href="/listas"
          className="flex flex-col items-center text-slate-400 text-xs font-bold hover:text-emerald-600"
        >
          <span className="text-base">📋</span> Listas
        </Link>
        <Link
          href="/comparar"
          className="flex flex-col items-center text-emerald-600 text-xs font-bold"
        >
          <span className="text-base">📊</span> Cotação
        </Link>
        <Link
          href="/historico"
          className="flex flex-col items-center text-slate-400 text-xs font-bold hover:text-emerald-600"
        >
          <span className="text-base">📜</span> Histórico
        </Link>
      </nav>
    </div>
  );
}