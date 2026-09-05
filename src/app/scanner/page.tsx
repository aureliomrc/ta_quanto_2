'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

export default function LeitorFolhetoPage() {
  const [mercado, setMercado] = useState('Assaí');
  const [regiao, setRegiao] = useState('SUDESTE');
  const [imagemBase64, setImagemBase64] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const [streamAtivo, setStreamAtivo] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputArquivoRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const desligarCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setStreamAtivo(false);
  };

  useEffect(() => {
    return () => desligarCamera();
  }, []);

  const iniciarWebcam = async () => {
    try {
      setMensagem('');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 } },
      });
      streamRef.current = stream;
      setStreamAtivo(true);

      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      }, 100);
    } catch {
      inputArquivoRef.current?.click();
    }
  };

  // Função essencial: Redimensiona e comprime a imagem para não estourar o limite do servidor
  const comprimirEGuardarImagem = (source: HTMLVideoElement | HTMLImageElement) => {
    const canvas = canvasRef.current || document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const maxWidth = 1024; // Define uma largura máxima razoável
    const width = 'videoWidth' in source ? source.videoWidth : source.width;
    const height = 'videoHeight' in source ? source.videoHeight : source.height;

    const scale = maxWidth / (width || 640);
    canvas.width = maxWidth;
    canvas.height = (height || 480) * scale;

    if (ctx) {
      ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
      // Salva como JPEG com 60% de qualidade para reduzir drasticamente o tamanho (Base64 menor)
      const base64Comprimido = canvas.toDataURL('image/jpeg', 0.6);
      setImagemBase64(base64Comprimido);
    }
  };

  const capturarFotoVideo = () => {
    if (videoRef.current) {
      comprimirEGuardarImagem(videoRef.current);
      desligarCamera();
    }
  };

  const handleUploadArquivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => comprimirEGuardarImagem(img);
        img.src = reader.result as string;
        setMensagem('');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEnviar = async () => {
    if (!imagemBase64) return;

    const token = localStorage.getItem('token');
    if (!token) {
      setMensagem('❌ Você precisa estar logado para realizar a leitura.');
      return;
    }

    setCarregando(true);
    setMensagem('Analisando ofertas com a IA e salvando no banco...');

    try {
      // ✅ ROTA CORRIGIDA AQUI: Chamando a API de processamento do folheto
      const res = await fetch('/api/scan-folheto', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ imagemBase64, mercado, regiao }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setMensagem(`✅ Sucesso! ${data.totalProcessados || 0} oferta(s) salva(s) na sua conta!`);
        // Limpa a imagem para o próximo scanner
        setImagemBase64(null);
      } else {
        // Exibe a mensagem de erro específica retornada pela API
        setMensagem(`❌ ${data.error || 'Falha ao processar imagem.'}`);
      }
    } catch (err: any) {
      setMensagem(`❌ Erro de conexão com o servidor: ${err.message || ''}`);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 max-w-md mx-auto flex flex-col justify-between pb-24 font-sans">
      <div className="space-y-4">
        <header className="flex items-center gap-2 border-b border-slate-200 pb-3">
          <span className="text-2xl">📷</span>
          <h1 className="text-lg font-black text-emerald-700 uppercase tracking-tight">
            LEITOR DE FOLHETO (IA)
          </h1>
        </header>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3 shadow-sm">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Mercado</label>
            <input
              type="text"
              value={mercado}
              onChange={(e) => setMercado(e.target.value)}
              placeholder="Ex: Assaí, Carrefour, Atacadão..."
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Região do Folheto</label>
            <select
              value={regiao}
              onChange={(e) => setRegiao(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="SUDESTE">SUDESTE</option>
              <option value="SUL">SUL</option>
              <option value="NORDESTE">NORDESTE</option>
              <option value="CENTRO_OESTE">CENTRO-OESTE</option>
              <option value="NORTE">NORTE</option>
            </select>
          </div>
        </div>

        <input
          type="file"
          accept="image/*"
          ref={inputArquivoRef}
          onChange={handleUploadArquivo}
          className="hidden"
        />

        {/* Canvas escondido para auxiliar na compressão de imagem */}
        <canvas ref={canvasRef} className="hidden" />

        <div className="bg-black rounded-2xl p-4 flex flex-col items-center justify-center min-h-[260px] shadow-lg border border-slate-800 relative overflow-hidden">
          {imagemBase64 ? (
            <div className="w-full space-y-3 text-center">
              <img
                src={imagemBase64}
                alt="Foto Selecionada"
                className="max-h-56 mx-auto rounded-xl object-contain border border-slate-700"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setImagemBase64(null);
                    desligarCamera();
                  }}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2.5 rounded-xl font-bold text-xs"
                >
                  Tirar Outra
                </button>
                <button
                  type="button"
                  onClick={handleEnviar}
                  disabled={carregando}
                  // Força type="button" para evitar submit acidental de forms
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-xl font-bold text-xs disabled:opacity-50 active:scale-95 transition-all"
                >
                  {carregando ? 'Processando...' : 'Analisar & Salvar'}
                </button>
              </div>
            </div>
          ) : streamAtivo ? (
            <div className="w-full flex flex-col items-center space-y-3">
              <video
                ref={videoRef}
                playsInline
                muted
                className="w-full max-h-56 rounded-xl object-cover border border-slate-700"
              />
              <div className="flex gap-2 w-full">
                <button
                  type="button"
                  onClick={desligarCamera}
                  className="flex-1 bg-slate-700 text-white py-2.5 rounded-xl font-bold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={capturarFotoVideo}
                  className="flex-1 bg-emerald-600 text-white py-2.5 rounded-xl font-bold text-xs active:scale-95 transition-all"
                >
                  📸 Capturar Frame
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3 w-full max-w-xs">
              <button
                type="button"
                onClick={iniciarWebcam}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3.5 px-4 rounded-xl text-xs shadow-lg active:scale-95 transition-all"
              >
                📹 Ativar Câmera / Webcam
              </button>
              <button
                type="button"
                onClick={() => inputArquivoRef.current?.click()}
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-3 px-4 rounded-xl text-xs border border-slate-700 active:scale-95 transition-all"
              >
                🖼️ Selecionar Foto / Galeria
              </button>
            </div>
          )}
        </div>

        {mensagem && (
          <div className="bg-white p-3 rounded-xl border border-slate-200 text-center text-xs font-bold text-slate-800 shadow-sm">
            {mensagem}
          </div>
        )}
      </div>

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