'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

interface Item {
  id?: string;
  nome?: string;
  produto?: string;
  descricao?: string;
  quantidade?: number;
  comprado?: boolean;
}

interface ListaData {
  id?: string;
  nome?: string;
  itens?: Item[];
}

export default function ListasPage() {
  const [lista, setLista] = useState<ListaData | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [novoItem, setNovoItem] = useState('');

  const carregarLista = async () => {
    try {
      const res = await fetch('/api/listas');
      if (res.ok) {
        const data = await res.json();
        setLista(data);
      }
    } catch (err) {
      console.error('Erro ao carregar lista no cliente:', err);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarLista();
  }, []);

  return (
    <div className="min-h-screen bg-slate-100 p-4 max-w-md mx-auto flex flex-col justify-between pb-24 font-sans">
      <div className="space-y-4">
        <header className="flex items-center gap-2 border-b border-slate-200 pb-3">
          <span className="text-2xl">📋</span>
          <h1 className="text-lg font-black text-emerald-700 uppercase tracking-tight">
            LISTA DE COMPRAS
          </h1>
        </header>

        {carregando ? (
          <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center text-xs font-bold text-slate-500 shadow-sm">
            Carregando sua lista...
          </div>
        ) : (
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider">
              {lista?.nome || 'Minha Lista'}
            </h2>

            {!lista?.itens || lista.itens.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-2">
                Nenhum item cadastrado.
              </p>
            ) : (
              <div className="divide-y divide-slate-100 space-y-1">
                {lista.itens.map((item, index) => {
                  const nomeExibicao = item.nome || item.produto || item.descricao || 'Item';
                  return (
                    <div
                      key={item.id || index}
                      className="pt-2 flex justify-between items-center text-xs text-slate-700"
                    >
                      <span className="font-semibold">• {nomeExibicao}</span>
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