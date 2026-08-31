'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function CompararPage() {
  const [carregando, setCarregando] = useState(false);
  const [produtosExtraidos, setProdutosExtraidos] = useState<{ produto: string; preco: number }[]>([]);

  const handleProcessarFolheto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCarregando(true);
    const reader = new FileReader();

    reader.onloadend = async () => {
      const base64Image = reader.result as string;
      try {
        const res = await fetch('/api/comparador', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64Image }),
        });

        const data = await res.json();
        if (data.result) {
          setProdutosExtraidos(data.result);
        }
      } catch (err) {
        alert('Erro ao processar folheto.');
      } finally {
        setCarregando(false);
      }
    };

    reader.readAsDataURL(file);
  };

  return (
    <div className="min-h-screen bg-[#f4f6f8] flex flex-col justify-between font-sans">
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-black text-[#008744]">Bipar Folheto de Ofertas</h1>
      </header>

      <main className="p-4 max-w-lg mx-auto space-y-4 w-full">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-center space-y-4">
          <p className="text-xs font-semibold text-slate-600">
            Tire uma foto ou envie uma imagem do encarte/folheto para extrair os preços automaticamente com Gemini.
          </p>

          <label className="inline-block bg-[#008744] hover:bg-emerald-700 text-white font-bold text-xs px-5 py-3 rounded-full cursor-pointer transition-all shadow-md">
            {carregando ? 'Processando Imagem...' : '📷 Fotografar / Enviar Folheto'}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleProcessarFolheto}
              disabled={carregando}
              className="hidden"
            />
          </label>
        </div>

        {/* Exibição dos itens lidos */}
        {produtosExtraidos.length > 0 && (
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Produtos Encontrados ({produtosExtraidos.length})
            </h2>
            <div className="divide-y divide-slate-100">
              {produtosExtraidos.map((item, idx) => (
                <div key={idx} className="py-2 flex justify-between text-xs text-slate-700">
                  <span>{item.produto}</span>
                  <span className="font-bold text-[#008744]">R$ {item.preco?.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Menu do Rodapé */}
      <nav className="bg-white border-t border-slate-200 px-8 py-2.5 flex justify-around items-center sticky bottom-0 left-0 right-0 z-10">
        <Link href="/listas" className="flex flex-col items-center text-slate-400 hover:text-[#008744]">
          <span className="text-lg">📋</span>
          <span className="text-[11px] font-bold mt-0.5">Listas</span>
        </Link>
        <Link href="/comparar" className="flex flex-col items-center text-[#008744]">
          <span className="text-lg">📊</span>
          <span className="text-[11px] font-bold mt-0.5">Comparar</span>
        </Link>
        <Link href="/historico" className="flex flex-col items-center text-slate-400 hover:text-[#008744]">
          <span className="text-lg">📜</span>
          <span className="text-[11px] font-bold mt-0.5">Histórico</span>
        </Link>
      </nav>
    </div>
  );
}