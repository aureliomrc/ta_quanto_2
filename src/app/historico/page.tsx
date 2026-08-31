'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

interface Lista {
  id: string;
  nome: string;
  itens: { id: string; nome: string; quantidade: number }[];
}

export default function HistoricoPage() {
  const [listas, setListas] = useState<Lista[]>([]);

  useEffect(() => {
    const carregarListas = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;

      const res = await fetch('/api/listas', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setListas(data);
      }
    };
    carregarListas();
  }, []);

  return (
    <div className="min-h-screen bg-[#f4f6f8] flex flex-col justify-between font-sans">
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-black text-[#008744]">Histórico e Cotações</h1>
      </header>

      <main className="p-4 max-w-lg mx-auto space-y-4 w-full">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <h2 className="text-xs font-bold text-slate-500 tracking-wider uppercase">
            Resumo das suas listas ativas
          </h2>

          {listas.length === 0 ? (
            <p className="text-xs text-slate-400">Nenhuma lista encontrada.</p>
          ) : (
            <div className="space-y-3">
              {listas.map((lista) => (
                <div key={lista.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-xs text-slate-800">{lista.nome}</h3>
                    <p className="text-[10px] text-slate-400">{lista.itens?.length || 0} produtos cadastrados</p>
                  </div>
                  <button className="bg-blue-50 text-blue-600 font-bold text-xs px-3 py-1.5 rounded-lg border border-blue-200">
                    Comparar Preços
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Menu do Rodapé */}
      <nav className="bg-white border-t border-slate-200 px-8 py-2.5 flex justify-around items-center sticky bottom-0 left-0 right-0 z-10">
        <Link href="/listas" className="flex flex-col items-center text-slate-400 hover:text-[#008744]">
          <span className="text-lg">📋</span>
          <span className="text-[11px] font-bold mt-0.5">Listas</span>
        </Link>
        <Link href="/comparar" className="flex flex-col items-center text-slate-400 hover:text-[#008744]">
          <span className="text-lg">📊</span>
          <span className="text-[11px] font-bold mt-0.5">Comparar</span>
        </Link>
        <Link href="/historico" className="flex flex-col items-center text-[#008744]">
          <span className="text-lg">📜</span>
          <span className="text-[11px] font-bold mt-0.5">Histórico</span>
        </Link>
      </nav>
    </div>
  );
}