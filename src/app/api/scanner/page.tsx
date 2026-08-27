'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function LeitorFolhetoPage() {
  const [mercado, setMercado] = useState('Assaí');
  const [regiao, setRegiao] = useState('SUDESTE');
  const [imagemBase64, setImagemBase64] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [mensagem, setMensagem] = useState('');

  const handleArquivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagemBase64(reader.result as string);
        setMensagem('');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEnviar = async () => {
    if (!imagemBase64) return;
    setCarregando(true);
    setMensagem('Analisando imagem com a IA...');

    try {
      const res = await fetch('/api/scan-folheto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imagemBase64, mercado, regiao }),
      });

      const data = await res.json();

      if (res.ok) {
        setMensagem(`✅ Sucesso! ${data.totalProcessados || 0} oferta(s) salva(s).`);
        setImagemBase64(null);
      } else {
        setMensagem(`❌ Erro: ${data.error || 'Falha ao processar.'}`);
      }
    } catch (err) {
      setMensagem('❌ Erro de conexão.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 max-w-md mx-auto flex flex-col justify-between pb-24 font-sans">
      <div className="space-y-4">
        <header className="flex items-center gap-2 border-b border-slate-200 pb-3">
          <span className="text-2xl">📷</span>
          <h1 className="text-lg font-black text-emerald-700 uppercase">LEITOR DE FOLHETO (IA)</h1>
        </header>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Mercado</label>
            <input
              type="text"
              value={mercado}
              onChange={(e) => setMercado(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Região</label>
            <select
              value={regiao}
              onChange={(e) => setRegiao(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm bg-white"
            >
              <option value="SUDESTE">SUDESTE</option>
              <option value="SUL">SUL</option>
              <option value="NORDESTE">NORDESTE</option>
              <option value="CENTRO-OESTE">CENTRO-OESTE</option>
              <option value="NORTE">NORTE</option>
            </select>
          </div>
        </div>

        {/* ÁREA DE CAPTURA SIMPLES */}
        <div className="bg-black rounded-2xl p-6 flex flex-col items-center justify-center min-h-[220px]">
          {imagemBase64 ? (
            <div className="w-full space-y-3 text-center">
              <img src={imagemBase64} alt="Foto" className="max-h-52 mx-auto rounded-lg object-contain" />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setImagemBase64(null)}
                  className="flex-1 bg-slate-700 text-white py-2.5 rounded-xl font-bold text-xs"
                >
                  Refazer
                </button>
                <button
                  type="button"
                  onClick={handleEnviar}
                  disabled={carregando}
                  className="flex-1 bg-emerald-600 text-white py-2.5 rounded-xl font-bold text-xs disabled:opacity-50"
                >
                  {carregando ? 'Enviando...' : 'Analisar'}
                </button>
              </div>
            </div>
          ) : (
            <label className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 px-6 rounded-2xl text-sm cursor-pointer shadow-lg active:scale-95 transition-all text-center">
              📸 TIKAR FOTO OU ESCOLHER
              <input
                type="file"
                accept="image/*"
                onChange={handleArquivo}
                className="hidden"
              />
            </label>
          )}
        </div>

        {mensagem && (
          <div className="bg-white p-3 rounded-xl border text-center text-xs font-bold text-slate-800">
            {mensagem}
          </div>
        )}
      </div>

      <nav className="bg-white border-t px-6 py-3 flex justify-around items-center fixed bottom-0 left-0 right-0 z-10">
        <Link href="/listas" className="text-slate-400 text-xs font-bold flex flex-col items-center">
          <span>📋</span> Listas
        </Link>
        <Link href="/scanner" className="text-emerald-600 text-xs font-bold flex flex-col items-center">
          <span>📷</span> Comparar
        </Link>
        <Link href="/historico" className="text-slate-400 text-xs font-bold flex flex-col items-center">
          <span>📜</span> Histórico
        </Link>
      </nav>
    </div>
  );
}