'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';

export default function ScannerPage() {
  const [imagem, setImagem] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [mensagem, setMensagem] = useState('');
  
  // Referências para os inputs de arquivo
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galeriaInputRef = useRef<HTMLInputElement>(null);

  // Converte a imagem para Base64 para enviar à API
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagem(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const enviarParaProcessamento = async () => {
    if (!imagem) return;
    setCarregando(true);
    setMensagem('Analisando imagem (folheto, etiqueta ou gôndola)...');

    try {
      const response = await fetch('/api/scan-folheto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imagemBase64: imagem }),
      });

      const data = await response.json();

      if (response.ok) {
        setMensagem(`✅ Sucesso! ${data.ofertas?.length || 0} preço(s) salvos no histórico.`);
        setImagem(null);
      } else {
        setMensagem(`❌ Erro: ${data.error || 'Falha ao ler imagem.'}`);
      }
    } catch (err) {
      console.error(err);
      setMensagem('❌ Erro de conexão ao enviar imagem.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f6f9] pb-24 p-4 max-w-lg mx-auto">
      <header className="bg-white p-4 rounded-2xl border mb-4 shadow-sm text-center">
        <h1 className="text-lg font-black text-[#008744]">📷 CAPTURAR PREÇOS</h1>
        <p className="text-xs text-slate-500 mt-1">
          Tire foto de <strong>Folhetos</strong>, <strong>Etiquetas de Gôndola</strong> ou <strong>Cartazes de Oferta</strong>.
        </p>
      </header>

      {/* INPUTS ESCONDIDOS COM OS ATRIBUTOS CORRETOS */}
      {/* Câmera direta (capture="environment" abre a câmera traseira do celular) */}
      <input
        type="file"
        accept="image/*"
        capture="environment"
        ref={cameraInputRef}
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Galeria de Fotos */}
      <input
        type="file"
        accept="image/*"
        ref={galeriaInputRef}
        onChange={handleFileChange}
        className="hidden"
      />

      {/* ÁREA DE PRÉ-VISUALIZAÇÃO DA FOTO OU BOTÕES DE CAPTURA */}
      <div className="bg-white p-6 rounded-2xl border shadow-sm text-center mb-4">
        {imagem ? (
          <div className="space-y-4">
            <img src={imagem} alt="Pré-visualização" className="w-full max-h-64 object-contain rounded-lg border" />
            <div className="flex gap-2">
              <button
                onClick={() => setImagem(null)}
                className="flex-1 bg-gray-200 text-gray-700 py-2.5 rounded-xl font-bold text-xs"
              >
                Refazer Foto
              </button>
              <button
                onClick={enviarParaProcessamento}
                disabled={carregando}
                className="flex-1 bg-[#008744] text-white py-2.5 rounded-xl font-bold text-xs disabled:opacity-50"
              >
                {carregando ? 'Processando...' : 'Salvar Preços'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="text-4xl">📸</div>
            <p className="text-xs text-slate-600 font-medium">Como deseja enviar a foto?</p>
            
            <div className="flex flex-col gap-2">
              <button
                onClick={() => cameraInputRef.current?.click()}
                className="w-full bg-[#008744] text-white py-3 rounded-xl font-bold text-xs shadow-sm active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <span>📷</span> Abrir Câmera do Celular
              </button>
              
              <button
                onClick={() => galeriaInputRef.current?.click()}
                className="w-full bg-slate-100 text-slate-700 border py-3 rounded-xl font-bold text-xs active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <span>🖼️</span> Escolher da Galeria
              </button>
            </div>
          </div>
        )}
      </div>

      {mensagem && (
        <div className="bg-white p-4 rounded-xl border text-center text-xs font-bold text-slate-700 shadow-sm">
          {mensagem}
        </div>
      )}

      {/* NAVEGAÇÃO INFERIOR */}
      <nav className="bg-white border-t px-6 py-3 flex justify-around items-center fixed bottom-0 left-0 right-0 z-10">
        <Link href="/listas" className="flex flex-col items-center text-gray-400 text-xs font-bold">
          <span>📋</span> Listas
        </Link>
        <Link href="/scanner" className="flex flex-col items-center text-[#008744] text-xs font-bold">
          <span>📷</span> Comparar
        </Link>
        <Link href="/historico" className="flex flex-col items-center text-gray-400 text-xs font-bold">
          <span>📜</span> Histórico
        </Link>
      </nav>
    </div>
  );
}