'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ListasPage() {
  const router = useRouter();
  const [novaLista, setNovaLista] = useState('');
  const [listas, setListas] = useState([
    { id: '1', titulo: 'COMPRAS DO MÊS', quantidade: 7 }
  ]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
    }
  }, [router]);

  const handleCriarLista = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaLista.trim()) return;

    setListas([
      ...listas,
      { id: Date.now().toString(), titulo: novaLista.toUpperCase(), quantidade: 0 }
    ]);
    setNovaLista('');
  };

  const handleSair = () => {
    localStorage.removeItem('token');
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-[#f4f6f8] flex flex-col justify-between font-sans">
      
      {/* Topo / Header */}
      <div>
        <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🛒</span>
            <h1 className="text-lg font-black text-[#008744]">TÁ QUANTO?</h1>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="bg-emerald-100 text-[#008744] text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
              <span>👤</span> 1
            </div>
            <button
              onClick={handleSair}
              className="text-xs font-bold text-red-500 hover:text-red-700 ml-1"
            >
              Sair
            </button>
          </div>
        </header>

        {/* Conteúdo Principal */}
        <main className="p-4 max-w-lg mx-auto space-y-5">
          
          {/* Card Criar Nova Lista */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
              <span className="text-base font-black">+</span>
              <span>Nova Lista de Compras</span>
            </div>

            <form onSubmit={handleCriarLista} className="flex gap-2">
              <input
                type="text"
                value={novaLista}
                onChange={(e) => setNovaLista(e.target.value)}
                placeholder="EX: MENSAL, CHURRASCO..."
                className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-300 uppercase"
              />
              <button
                type="submit"
                className="bg-[#1d70f5] hover:bg-blue-600 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-sm active:scale-95"
              >
                + Criar
              </button>
            </form>
          </div>

          {/* Subcabeçalho de Listas */}
          <div className="flex justify-between items-center text-xs px-1">
            <span className="font-bold text-slate-400 tracking-wider uppercase">
              SUAS LISTAS ({listas.length})
            </span>
            <button className="text-[#1d70f5] font-bold flex items-center gap-1 hover:underline">
              <span>🔄</span> Sincronizar
            </button>
          </div>

          {/* Cartões de Listas */}
          <div className="space-y-3">
            {listas.map((lista) => (
              <div
                key={lista.id}
                className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between cursor-pointer hover:border-slate-300 transition-all"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">📁</span>
                  <span className="font-extrabold text-xs text-slate-800 tracking-wide">
                    {lista.titulo}
                  </span>
                  <span className="bg-blue-50 text-blue-600 font-bold text-[10px] px-2 py-0.5 rounded-full">
                    {lista.quantidade} itens
                  </span>
                </div>
                <span className="text-slate-400 text-xs">▼</span>
              </div>
            ))}
          </div>

        </main>
      </div>

      {/* Menu do Rodapé */}
      <nav className="bg-white border-t border-slate-200 px-8 py-2.5 flex justify-around items-center sticky bottom-0 left-0 right-0 z-10">
        <Link href="/listas" className="flex flex-col items-center text-[#008744]">
          <span className="text-lg">📋</span>
          <span className="text-[11px] font-bold mt-0.5">Listas</span>
        </Link>
        <Link href="/scanner" className="flex flex-col items-center text-slate-400 hover:text-[#008744]">
          <span className="text-lg">📊</span>
          <span className="text-[11px] font-bold mt-0.5">Comparar</span>
        </Link>
        <Link href="/cupons" className="flex flex-col items-center text-slate-400 hover:text-[#008744]">
          <span className="text-lg">📜</span>
          <span className="text-[11px] font-bold mt-0.5">Cupons</span>
        </Link>
      </nav>

    </div>
  );
}