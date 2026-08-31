'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

interface Item {
  id: string;
  nome?: string;
  produto?: string;
  descricao?: string;
  quantidade?: number;
  comprado?: boolean;
}

interface ListaData {
  id: string;
  nome: string;
  itens: Item[];
}

export default function ListasPage() {
  const [lista, setLista] = useState<ListaData | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [novoItemNome, setNovoItemNome] = useState('');
  const [enviando, setEnviando] = useState(false);

  const carregarLista = async () => {
    try {
      const res = await fetch('/api/listas');
      if (res.ok) {
        const data = await res.json();
        setLista(data);
      }
    } catch (err) {
      console.error('Erro ao carregar lista:', err);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarLista();
  }, []);

  const handleAdicionarItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoItemNome.trim() || enviando) return;

    setEnviando(true);
    try {
      const res = await fetch('/api/listas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: novoItemNome, listaId: lista?.id }),
      });

      if (res.ok) {
        setNovoItemNome('');
        await carregarLista();
      }
    } catch (err) {
      console.error('Erro ao adicionar item:', err);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 max-w-md mx-auto flex flex-col justify-between pb-24 font-sans">
      <div className="space-y-4">
        <header className="flex items-center gap-2 border-b border-slate-200 pb-3">
          <span className="text-2xl">📋</span>
          <h1 className="text-lg font-black text-emerald-700 uppercase tracking-tight">
            LISTA DE COMPRAS
          </h1>
        </header>

        {/* Form para adicionar novos produtos */}
        <form onSubmit={handleAdicionarItem} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex gap-2">
          <input
            type="text"
            value={novoItemNome}
            onChange={(e) => setNovoItemNome(e.target.value)}
            placeholder="Adicionar produto na lista..."
            className="flex-1 border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button
            type="submit"
            disabled={enviando || !novoItemNome.trim()}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl text-xs disabled:opacity-50 transition-all"
          >
            {enviando ? '...' : 'Adicionar'}
          </button>
        </form>

        {/* Exibição dos Itens da Lista */}
        {carregando ? (
          <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center text-xs font-bold text-slate-500 shadow-sm">
            Carregando lista...
          </div>
        ) : (
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                {lista?.nome || 'Minha Lista Padrão'}
              </h2>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                {lista?.itens?.length || 0} itens
              </span>
            </div>

            {!lista?.itens || lista.itens.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">
                Nenhum item adicionado à lista.
              </p>
            ) : (
              <div className="divide-y divide-slate-100 space-y-1">
                {lista.itens.map((item, index) => {
                  const nome = item.nome || item.produto || item.descricao || 'Item sem nome';
                  return (
                    <div
                      key={item.id || index}
                      className="pt-2 flex justify-between items-center text-xs text-slate-700"
                    >
                      <span className="font-semibold text-slate-800">
                        {index + 1}. {nome}
                      </span>
                      <span className="bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full text-[10px]">
                        Qtd: {item.quantidade || 1}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navegação Principal */}
      <nav className="bg-white border-t border-slate-200 px-6 py-3 flex justify-around items-center fixed bottom-0 left-0 right-0 z-10">
        <Link href="/listas" className="flex flex-col items-center text-emerald-600 text-xs font-bold">
          <span>📋</span> Listas
        </Link>
        <Link href="/comparar" className="flex flex-col items-center text-slate-400 text-xs font-bold">
          <span>🏷️</span> Cotação
        </Link>
        <Link href="/historico" className="flex flex-col items-center text-slate-400 text-xs font-bold">
          <span>📊</span> Comparação/Histórico
        </Link>
      </nav>
    </div>
  );
}