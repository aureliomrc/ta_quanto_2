'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

export default function LeitorFolhetoPage() {
  const [mercado, setMercado] = useState('Assaí');
  const [regiao, setRegiao] = useState('SUDESTE');
  const [imagemBase64, setImagemBase64] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [mensagem, setMensagem] = useState('');

  const inputCameraRef = useRef<HTMLInputElement>(null);
  const inputGaleriaRef = useRef<HTMLInputElement>(null);

  // Garante que qualquer stream de câmera em segundo plano seja desligado ao entrar na página
  useEffect(() => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then((stream) => {
          stream.getTracks().forEach((track) => track.stop());
        })
        .catch(() => {});
    }
  }, []);

  // Processa o arquivo retornado da câmera ou galeria
  const handleCaptura = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  // Envia a imagem capturada para a API do Gemini / Prisma
  const handleEnviar = async () => {
    if (!imagemBase64) return;
    setCarregando(true);
    setMensagem('Analisando imagem com a IA...');

    try {
      const res = await fetch('/api/scan-folheto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imagemBase64,
          mercado,
          regiao,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setMensagem(`✅ Sucesso! ${data.totalProcessados || data.ofertas?.length || 0} oferta(s) salva(s).`);
        setImagemBase64(null);
      } else {
        setMensagem(`❌ Erro: ${data.error || 'Falha ao processar.'}`);
      }
    } catch (err) {
      console.error(err);
      setMensagem('❌ Erro ao conectar com o servidor.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 max-w-md mx-auto flex flex-col justify-between pb-24 font-sans">
      <div className="space-y-4">
        {/* Cabeçalho */}
        <header className="flex items-center gap-2 border-b border-slate-200 pb-3">
          <span className="text-2xl">📷</span>
          <h1 className="text-lg font-black text-emerald-700 uppercase tracking-tight">
            LEITOR DE FOLHETO & GÔNDOLA (IA)
          </h1>
        </header>

        {/* Configurações do Mercado */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3 shadow-sm">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Nome Fantasia do Mercado
            </label>
            <input
              type="text"
              value={mercado}
              onChange={(e) => setMercado(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Região do Folheto
            </label>
            <select
              value={regiao}
              onChange={(e) => setRegiao(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="SUDESTE">SUDESTE</option>
              <option value="SUL">SUL</option>
              <option value="NORDESTE">NORDESTE</option>
              <option value="CENTRO-OESTE">CENTRO-OESTE</option>
              <option value="NORTE">NORTE</option>
            </select>
          </div>
        </div>

        {/* INPUTS OCULTOS (Evitam que o Chrome fique preso em stream de vídeo) */}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          ref={inputCameraRef}
          onChange={handleCaptura}
          className="hidden"
        />

        <input
          type="file"
          accept="image/*"
          ref={inputGaleriaRef}
          onChange={handleCaptura}
          className="hidden"
        />

        {/* Área Central de Captura e Pré-visualização */}
        <div className="bg-black rounded-2xl p-6 flex flex-col items-center justify-center min-h-[280px] shadow-lg relative overflow-hidden border border-slate-800">
          {imagemBase64 ? (
            <div className="w-full space-y-4">
              <img
                src={imagemBase64}
                alt="Foto Capturada"
                className="max-h-60 w-auto mx-auto rounded-xl border border-slate-700 object-contain shadow-md"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setImagemBase64(null)}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-xl font-bold text-xs transition-all"
                >
                  Tirar Outra Foto
                </button>
                <button
                  onClick={handleEnviar}
                  disabled={carregando}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-bold text-xs disabled:opacity-50 transition-all shadow-md"
                >
                  {carregando ? 'Processando IA...' : 'Analisar & Salvar'}
                </button>
              </div>
            </div>
          ) : (
            <div className="w-full space-y-3">
              <button
                onClick={() => inputCameraRef.current?.click()}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 px-6 rounded-xl text-sm transition-all active:scale-95 shadow-lg flex items-center justify-center gap-2"
              >
                <span>📸</span> Abrir Câmera do Celular
              </button>

              <button
                onClick={() => inputGaleriaRef.current?.click()}
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-3 px-6 rounded-xl text-xs transition-all active:scale-95 border border-slate-700 flex items-center justify-center gap-2"
              >
                <span>🖼️</span> Escolher da Galeria
              </button>
            </div>
          )}
        </div>

        {mensagem && (
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-center text-xs font-bold text-slate-800 shadow-sm">
            {mensagem}
          </div>
        )}
      </div>

      {/* Navegação Inferior */}
      <nav className="bg-white border-t border-slate-200 px-6 py-3 flex justify-around items-center fixed bottom-0 left-0 right-0 z-10">
        <Link href="/listas" className="flex flex-col items-center text-slate-400 text-xs font-bold">
          <span>📋</span> Listas
        </Link>
        <Link href="/scanner" className="flex flex-col items-center text-emerald-600 text-xs font-bold">
          <span>📷</span> Comparar
        </Link>
        <Link href="/historico" className="flex flex-col items-center text-slate-400 text-xs font-bold">
          <span>📜</span> Histórico
        </Link>
      </nav>
    </div>
  );
}