import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import '../styles/auth.css';

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        setError('Email ou senha incorretos. Verifique seus dados e tente novamente.');
      } else if (error.message.includes('Email not confirmed')) {
        setError('Confirme seu email antes de fazer login. Verifique sua caixa de entrada.');
      } else if (error.message.includes('Too many requests')) {
        setError('Muitas tentativas. Aguarde alguns minutos e tente novamente.');
      } else {
        setError('Erro ao fazer login. Tente novamente.');
      }
      setLoading(false);
    } else {
      navigate('/dashboard', { replace: true });
    }
  };

  return (
    <div className="auth-container">
      {/* Background decoration */}
      <div className="auth-bg-decoration">
        <div className="auth-circle auth-circle-1"></div>
        <div className="auth-circle auth-circle-2"></div>
        <div className="auth-circle auth-circle-3"></div>
      </div>

      <div className="auth-card">
        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-logo-icon">
            <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="20" cy="20" r="20" fill="url(#grad1)" />
              <path d="M12 20C12 20 14 14 20 14C26 14 28 20 28 20C28 20 26 26 20 26C14 26 12 20 12 20Z" stroke="white" strokeWidth="2" fill="none"/>
              <circle cx="20" cy="20" r="4" fill="white"/>
              <defs>
                <linearGradient id="grad1" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#22c55e"/>
                  <stop offset="1" stopColor="#16a34a"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <h1 className="auth-logo-text">Adix Nutri</h1>
        </div>

        <div className="auth-header">
          <h2 className="auth-title">Bem-vinda de volta</h2>
          <p className="auth-subtitle">Faça login para acessar seu painel</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} id="login-form">
          {error && (
            <div className="auth-error" role="alert">
              <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="login-email" className="form-label">Email</label>
            <div className="input-wrapper">
              <svg className="input-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.5 6.5l7.5 5 7.5-5M3 5h14a1 1 0 011 1v8a1 1 0 01-1 1H3a1 1 0 01-1-1V6a1 1 0 011-1z"/>
              </svg>
              <input
                id="login-email"
                type="email"
                className="form-input"
                placeholder="seu@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="login-password" className="form-label">Senha</label>
            <div className="input-wrapper">
              <svg className="input-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="8" width="14" height="10" rx="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 8V6a3 3 0 016 0v2"/>
                <circle cx="10" cy="13" r="1.5" fill="currentColor" stroke="none"/>
              </svg>
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="Sua senha"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                minLength={6}
              />
              <button
                type="button"
                className="input-toggle-password"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                id="toggle-login-password"
              >
                {showPassword ? (
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" width="18" height="18">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 10C3.226 13.338 6.41 15.5 10 15.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A3 3 0 0113.772 13.772M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L18 18m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"/>
                  </svg>
                ) : (
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" width="18" height="18">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 10C3.732 6.943 6.522 5 10 5c3.478 0 6.268 1.943 7.542 5-1.274 3.057-4.064 5-7.542 5-3.478 0-6.268-1.943-7.542-5z"/>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            id="login-submit"
            type="submit"
            className="auth-btn"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="btn-spinner"></span>
                <span>Entrando...</span>
              </>
            ) : (
              'Entrar'
            )}
          </button>
        </form>

        <p className="auth-switch">
          Não tem conta?{' '}
          <Link to="/cadastro" id="go-to-register" className="auth-link">
            Cadastre-se
          </Link>
        </p>
      </div>
    </div>
  );
}
