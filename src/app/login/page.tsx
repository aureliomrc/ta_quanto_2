'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [aba, setAba] = useState<'login' | 'cadastro'>('login');

  // Campos de Login (Usuário e Senha)
  const [usuarioLogin, setUsuarioLogin] = useState('');
  const [senhaLogin, setSenhaLogin] = useState('');

  // Campos de Cadastro (Nome Completo, Usuário e Senha)
  const [nomeCadastro, setNomeCadastro] = useState('');
  const [usuarioCadastro, setUsuarioCadastro] = useState('');
  const [senhaCadastro, setSenhaCadastro] = useState('');

  // Estados de feedback
  const [carregando, setCarregando] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: 'erro' | 'sucesso'; texto: string } | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensagem(null);
    setCarregando(true);

    try {
      // Aponta para /api/auth (caminho da sua rota atual)
      const res = await fetch('/api/auth', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario: usuarioLogin, senha: senhaLogin }),
      });

      const data = await res.json();

      if (res.ok && data.token) {
        localStorage.setItem('token', data.token);
        router.push('/listas');
      } else {
        setMensagem({ tipo: 'erro', texto: data.error || 'Usuário ou senha incorretos.' });
      }
    } catch {
      setMensagem({ tipo: 'erro', texto: 'Erro de conexão com o servidor.' });
    } finally {
      setCarregando(false);
    }
  };

  const handleCadastro = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensagem(null);
    setCarregando(true);

    try {
      // Aponta para /api/auth e envia regioes como array vazio por padrão
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: nomeCadastro,
          usuario: usuarioCadastro,
          senha: senhaCadastro,
          regioes: [],
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setMensagem({ tipo: 'sucesso', texto: 'Conta criada! Faça login para continuar.' });
        setAba('login');
        setUsuarioLogin(usuarioCadastro);
        setSenhaLogin('');
      } else {
        setMensagem({ tipo: 'erro', texto: data.error || 'Erro ao realizar cadastro.' });
      }
    } catch {
      setMensagem({ tipo: 'erro', texto: 'Erro de conexão com o servidor.' });
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0c6396] flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-sm bg-white rounded-[2rem] p-6 shadow-2xl space-y-5">
        
        {/* Cabeçalho da Marca */}
        <div className="text-center space-y-1 pt-2">
          <div className="flex items-center justify-center gap-2">
            <span className="text-3xl">🛒</span>
            <h1 className="text-2xl font-black text-[#008744] tracking-tight">
              TÁ QUANTO?
            </h1>
          </div>
          <p className="text-xs font-semibold text-slate-500">
            {aba === 'login' ? 'Faça login para comparar suas listas' : 'Crie sua conta para começar'}
          </p>
        </div>

        {/* Abas ENTRAR e CADASTRAR-SE */}
        <div className="flex border-b border-slate-200 text-center font-bold text-xs tracking-wider">
          <button
            type="button"
            onClick={() => { setAba('login'); setMensagem(null); }}
            className={`flex-1 pb-2 transition-all ${
              aba === 'login'
                ? 'text-[#008744] border-b-2 border-[#008744]'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            ENTRAR
          </button>
          <button
            type="button"
            onClick={() => { setAba('cadastro'); setMensagem(null); }}
            className={`flex-1 pb-2 transition-all ${
              aba === 'cadastro'
                ? 'text-[#008744] border-b-2 border-[#008744]'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            CADASTRAR-SE
          </button>
        </div>

        {/* Alertas */}
        {mensagem && (
          <div
            className={`p-2.5 rounded-xl text-xs font-bold text-center border ${
              mensagem.tipo === 'erro'
                ? 'bg-red-50 text-red-600 border-red-200'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}
          >
            {mensagem.texto}
          </div>
        )}

        {/* Formulário de Login */}
        {aba === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-4 pt-1">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nome de Usuário
              </label>
              <input
                type="text"
                required
                value={usuarioLogin}
                onChange={(e) => setUsuarioLogin(e.target.value)}
                placeholder="Digite seu usuário"
                className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#008744] text-slate-700 placeholder-slate-300"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Senha
              </label>
              <input
                type="password"
                required
                value={senhaLogin}
                onChange={(e) => setSenhaLogin(e.target.value)}
                placeholder="Digite sua senha"
                className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#008744] text-slate-700 placeholder-slate-300"
              />
            </div>

            <button
              type="submit"
              disabled={carregando}
              className="w-full bg-[#008744] hover:bg-emerald-700 text-white font-bold py-3 rounded-full text-xs shadow-md active:scale-95 transition-all disabled:opacity-50 mt-2"
            >
              {carregando ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        ) : (
          /* Formulário de Cadastro */
          <form onSubmit={handleCadastro} className="space-y-3 pt-1">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nome Completo
              </label>
              <input
                type="text"
                required
                value={nomeCadastro}
                onChange={(e) => setNomeCadastro(e.target.value)}
                placeholder="Digite seu nome completo"
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#008744] text-slate-700 placeholder-slate-300"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nome de Usuário
              </label>
              <input
                type="text"
                required
                value={usuarioCadastro}
                onChange={(e) => setUsuarioCadastro(e.target.value)}
                placeholder="Crie um usuário"
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#008744] text-slate-700 placeholder-slate-300"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Senha
              </label>
              <input
                type="password"
                required
                value={senhaCadastro}
                onChange={(e) => setSenhaCadastro(e.target.value)}
                placeholder="Crie sua senha"
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#008744] text-slate-700 placeholder-slate-300"
              />
            </div>

            <button
              type="submit"
              disabled={carregando}
              className="w-full bg-[#008744] hover:bg-emerald-700 text-white font-bold py-3 rounded-full text-xs shadow-md active:scale-95 transition-all disabled:opacity-50 mt-2"
            >
              {carregando ? 'Cadastrando...' : 'Cadastrar'}
            </button>
          </form>
        )}

      </div>
    </div>
  );
}