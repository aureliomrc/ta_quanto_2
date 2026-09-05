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

  // Carrega as listas de compras do usuário para o Dropdown
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

  return (
    <div className="min-h-screen bg-slate-100 p-4 max-w-md mx-auto flex flex-col justify-between pb-24 font-sans">
      <div className="space-y-4">
        <header className="flex items-center gap-2 border-b border-slate-200 pb-3">
          <span className="text-2xl">📊</span>
          <h1 className="text-lg font-black text-emerald-700 uppercase tracking-tight">
            Cotação & Comparação
          </h1>
        </header>

        {/* Dropdowns e Controles */}
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

        {/* Exibição dos Totais nos 3 Mercados */}
        {resultado && (
          <div className="space-y-3">
            <h2 className="text-xs font-black text-slate-500 uppercase">Totais Estimados</h2>
            <div className="grid grid-cols-3 gap-2">
              {resultado.totais?.slice(0, 3).map((t: any, idx: number) => (
                <div key={idx} className="bg-white p-3 rounded-xl border border-slate-200 text-center shadow-sm">
                  <p className="text-[10px] font-bold text-slate-500 truncate">{t.mercado}</p>
                  <p className="text-sm font-black text-emerald-700">R$ {t.total.toFixed(2)}</p>
                </div>
              ))}
            </div>

            {/* Histórico/Itens em Cascata (Dropdown/Sanfona) */}
            <h2 className="text-xs font-black text-slate-500 uppercase pt-2">Detalhamento dos Itens</h2>
            <div className="space-y-2">
              {resultado.itens?.map((item: any, idx: number) => (
                <details
                  key={idx}
                  className="bg-white rounded-xl border border-slate-200 overflow-hidden group shadow-sm"
                >
                  <summary className="p-3 font-bold text-xs text-slate-800 cursor-pointer flex justify-between items-center bg-white hover:bg-slate-50 select-none">
                    <span>
                      {item.produto} <span className="text-slate-400 font-normal">(x{item.quantidade})</span>
                    </span>
                    <span className="text-slate-400 text-[10px] group-open:rotate-180 transition-transform">
                      ▼
                    </span>
                  </summary>

                  <div className="p-3 bg-slate-50 border-t border-slate-100 space-y-2">
                    {item.ofertas.slice(0, 3).map((of: any, oIdx: number) => (
                      <div key={oIdx} className="flex justify-between items-center text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-700">{of.mercado}:</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">
                            {of.mensagem}
                          </span>
                        </div>
                        <span className="font-black text-slate-900">R$ {of.preco.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Menu Fixo do Rodapé */}
      <nav className="bg-white border-t border-slate-200 px-6 py-3 flex justify-around items-center fixed bottom-0 left-0 right-0 z-10 shadow-lg">
        <Link href="/listas" className="flex flex-col items-center text-slate-400 text-xs font-bold hover:text-emerald-600">
          <span className="text-base">📋</span> Listas
        </Link>
        <Link href="/comparar" className="flex flex-col items-center text-emerald-600 text-xs font-bold">
          <span className="text-base">📊</span> Cotação
        </Link>
        <Link href="/historico" className="flex flex-col items-center text-slate-400 text-xs font-bold hover:text-emerald-600">
          <span className="text-base">📜</span> Histórico
        </Link>
      </nav>
    </div>
  );
}