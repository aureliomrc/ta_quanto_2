'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [aba, setAba] = useState<'login' | 'cadastro'>('login');

  // Campos de Login
  const [emailLogin, setEmailLogin] = useState('');
  const [senhaLogin, setSenhaLogin] = useState('');

  // Campos de Cadastro
  const [nomeCadastro, setNomeCadastro] = useState('');
  const [emailCadastro, setEmailCadastro] = useState('');
  const [senhaCadastro, setSenhaCadastro] = useState('');

  // Mensagens
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');

  // Processa Entrar (PUT conforme rotas do seu backend)
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    setSucesso('');
    setCarregando(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailLogin, senha: senhaLogin }),
      });

      const data = await res.json();

      if (res.ok && data.token) {
        localStorage.setItem('token', data.token);
        router.push('/listas');
      } else {
        setErro(data.error || 'Email ou senha inválidos.');
      }
    } catch {
      setErro('Erro ao conectar com o servidor.');
    } finally {
      setCarregando(false);
    }
  };

  // Processa Cadastro (POST)
  const handleCadastro = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    setSucesso('');
    setCarregando(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: nomeCadastro,
          email: emailCadastro,
          senha: senhaCadastro,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setSucesso('Conta criada com sucesso! Faça login para continuar.');
        setAba('login');
        setEmailLogin(emailCadastro);
        setSenhaLogin('');
      } else {
        setErro(data.error || 'Erro ao realizar cadastro.');
      }
    } catch {
      setErro('Erro de conexão com o servidor.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-4 font-sans">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-200">
        
        {/* Banner do Cabeçalho */}
        <div className="bg-[#0d5c91] text-white p-6 text-center">
          <h1 className="text-3xl font-black tracking-tight text-[#008744] bg-white inline-block px-4 py-1 rounded-2xl shadow-sm">
            TÁ QUANTO?
          </h1>
          <p className="text-xs text-slate-200 mt-2 font-medium">
            Economize e compare preços de supermercados em tempo real
          </p>
        </div>

        {/* Seleção de Abas */}
        <div className="flex border-b border-slate-200 bg-slate-50">
          <button
            type="button"
            onClick={() => {
              setAba('login');
              setErro('');
              setSucesso('');
            }}
            className={`flex-1 py-3 text-xs font-black tracking-wider uppercase transition-all ${
              aba === 'login'
                ? 'bg-white text-[#0d5c91] border-b-2 border-[#0d5c91]'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => {
              setAba('cadastro');
              setErro('');
              setSucesso('');
            }}
            className={`flex-1 py-3 text-xs font-black tracking-wider uppercase transition-all ${
              aba === 'cadastro'
                ? 'bg-white text-[#0d5c91] border-b-2 border-[#0d5c91]'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Cadastrar-se
          </button>
        </div>

        <div className="p-6">
          {/* Alertas */}
          {erro && (
            <div className="mb-4 bg-red-50 text-red-600 border border-red-200 p-3 rounded-xl text-xs font-bold text-center">
              {erro}
            </div>
          )}
          {sucesso && (
            <div className="mb-4 bg-emerald-50 text-emerald-700 border border-emerald-200 p-3 rounded-xl text-xs font-bold text-center">
              {sucesso}
            </div>
          )}

          {/* Form de Login */}
          {aba === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  E-mail
                </label>
                <input
                  type="email"
                  required
                  value={emailLogin}
                  onChange={(e) => setEmailLogin(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0d5c91]"
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
                  placeholder="••••••••"
                  className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0d5c91]"
                />
              </div>

              <button
                type="submit"
                disabled={carregando}
                className="w-full bg-[#008744] hover:bg-emerald-700 text-white font-black py-3 rounded-xl text-sm transition-all shadow-md active:scale-95 disabled:opacity-50 mt-2"
              >
                {carregando ? 'ENTRANDO...' : 'ENTRAR'}
              </button>
            </form>
          ) : (
            /* Form de Cadastro */
            <form onSubmit={handleCadastro} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nome Completo
                </label>
                <input
                  type="text"
                  required
                  value={nomeCadastro}
                  onChange={(e) => setNomeCadastro(e.target.value)}
                  placeholder="Ex: Maria Silva"
                  className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0d5c91]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  E-mail
                </label>
                <input
                  type="email"
                  required
                  value={emailCadastro}
                  onChange={(e) => setEmailCadastro(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0d5c91]"
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
                  placeholder="Crie uma senha segura"
                  className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0d5c91]"
                />
              </div>

              <button
                type="submit"
                disabled={carregando}
                className="w-full bg-[#0d5c91] hover:bg-blue-900 text-white font-black py-3 rounded-xl text-sm transition-all shadow-md active:scale-95 disabled:opacity-50 mt-2"
              >
                {carregando ? 'CRIANDO CONTA...' : 'CRIAR MINHA CONTA'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}