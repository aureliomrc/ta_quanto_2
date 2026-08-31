'use client';

import React from 'react';
import Link from 'next/link';

export default function HistoricoPage() {
  return (
    <div className="min-h-screen bg-[#f4f6f8] flex flex-col justify-between font-sans">
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">🛒</span>
          <h1 className="text-lg font-black text-[#008744]">Histórico de Compras</h1>
        </div>
      </header>

      <main className="p-4 max-w-lg mx-auto space-y-4 w-full">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-center text-slate-500 text-xs">
          Nenhum histórico registrado ainda.
        </div>
      </main>

      <nav className="bg-white border-t border-slate-200 px-8 py-2.5 flex justify-around items-center sticky bottom-0 left-0 right-0 z-10">
        <Link href="/listas" className="flex flex-col items-center text-slate-400 hover:text-[#008744]">
          <span className="text-lg">📋</span>
          <span className="text-[11px] font-bold mt-0.5">Listas</span>
        </Link>
        <Link href="/comparar" className="flex flex-col items-center text-slate-400 hover:text-[#008744]">
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