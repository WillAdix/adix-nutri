import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import '../styles/auth.css';

export function CadastroPage() {
  const navigate = useNavigate();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem. Verifique e tente novamente.');
      return;
    }

    if (!nome.trim()) {
      setError('Por favor, informe seu nome completo.');
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nome: nome.trim() },
      },
    });

    if (error) {
      if (error.message.includes('User already registered')) {
        setError('Este email já está cadastrado. Faça login ou use outro email.');
      } else if (error.message.includes('Password should be')) {
        setError('A senha deve ter no mínimo 6 caracteres.');
      } else if (error.message.includes('invalid email')) {
        setError('Email inválido. Verifique e tente novamente.');
      } else {
        setError('Erro ao criar conta. Tente novamente.');
      }
      setLoading(false);
    } else {
      // Redirect to dashboard; auth trigger handles nutricionistas insert
      navigate('/dashboard', { replace: true });
    }
  };

  const passwordStrength = (): { level: number; label: string; color: string } => {
    if (password.length === 0) return { level: 0, label: '', color: '' };
    if (password.length < 6) return { level: 1, label: 'Muito fraca', color: '#ef4444' };
    if (password.length < 8) return { level: 2, label: 'Fraca', color: '#f97316' };
    if (/^[a-zA-Z0-9]+$/.test(password)) return { level: 3, label: 'Média', color: '#eab308' };
    return { level: 4, label: 'Forte', color: '#22c55e' };
  };

  const strength = passwordStrength();

  return (
    <div className="auth-container">
      {/* Background decoration */}
      <div className="auth-bg-decoration">
        <div className="auth-circle auth-circle-1"></div>
        <div className="auth-circle auth-circle-2"></div>
        <div className="auth-circle auth-circle-3"></div>
      </div>

      <div className="auth-card auth-card-register">
        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-logo-icon">
            <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="20" cy="20" r="20" fill="url(#grad2)" />
              <path d="M12 20C12 20 14 14 20 14C26 14 28 20 28 20C28 20 26 26 20 26C14 26 12 20 12 20Z" stroke="white" strokeWidth="2" fill="none"/>
              <circle cx="20" cy="20" r="4" fill="white"/>
              <defs>
                <linearGradient id="grad2" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#22c55e"/>
                  <stop offset="1" stopColor="#16a34a"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <h1 className="auth-logo-text">Adix Nutri</h1>
        </div>

        <div className="auth-header">
          <h2 className="auth-title">Criar sua conta</h2>
          <p className="auth-subtitle">Comece a gerenciar seus pacientes hoje</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} id="register-form">
          {error && (
            <div className="auth-error" role="alert">
              <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="register-nome" className="form-label">Nome completo</label>
            <div className="input-wrapper">
              <svg className="input-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 10a4 4 0 100-8 4 4 0 000 8zm-7 8a7 7 0 1114 0H3z"/>
              </svg>
              <input
                id="register-nome"
                type="text"
                className="form-input"
                placeholder="Dra. Maria Silva"
                value={nome}
                onChange={e => setNome(e.target.value)}
                required
                autoComplete="name"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="register-email" className="form-label">Email</label>
            <div className="input-wrapper">
              <svg className="input-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.5 6.5l7.5 5 7.5-5M3 5h14a1 1 0 011 1v8a1 1 0 01-1 1H3a1 1 0 01-1-1V6a1 1 0 011-1z"/>
              </svg>
              <input
                id="register-email"
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
            <label htmlFor="register-password" className="form-label">Senha</label>
            <div className="input-wrapper">
              <svg className="input-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="8" width="14" height="10" rx="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 8V6a3 3 0 016 0v2"/>
                <circle cx="10" cy="13" r="1.5" fill="currentColor" stroke="none"/>
              </svg>
              <input
                id="register-password"
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                minLength={6}
              />
              <button
                type="button"
                className="input-toggle-password"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                id="toggle-register-password"
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
            {/* Password strength indicator */}
            {password.length > 0 && (
              <div className="password-strength">
                <div className="strength-bars">
                  {[1, 2, 3, 4].map(i => (
                    <div
                      key={i}
                      className="strength-bar"
                      style={{ backgroundColor: i <= strength.level ? strength.color : '#e5e7eb' }}
                    />
                  ))}
                </div>
                <span className="strength-label" style={{ color: strength.color }}>
                  {strength.label}
                </span>
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="register-confirm-password" className="form-label">Confirmar senha</label>
            <div className="input-wrapper">
              <svg className="input-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <input
                id="register-confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                className={`form-input ${confirmPassword && password !== confirmPassword ? 'input-error' : ''} ${confirmPassword && password === confirmPassword && confirmPassword.length > 0 ? 'input-success' : ''}`}
                placeholder="Repita sua senha"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
                minLength={6}
              />
              <button
                type="button"
                className="input-toggle-password"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? 'Ocultar confirmação' : 'Mostrar confirmação'}
                id="toggle-confirm-password"
              >
                {showConfirmPassword ? (
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
            {confirmPassword && password !== confirmPassword && (
              <p className="field-error">As senhas não coincidem</p>
            )}
            {confirmPassword && password === confirmPassword && confirmPassword.length >= 6 && (
              <p className="field-success">✓ Senhas coincidem</p>
            )}
          </div>

          <button
            id="register-submit"
            type="submit"
            className="auth-btn"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="btn-spinner"></span>
                <span>Criando conta...</span>
              </>
            ) : (
              'Criar conta'
            )}
          </button>
        </form>

        <p className="auth-switch">
          Já tem conta?{' '}
          <Link to="/login" id="go-to-login" className="auth-link">
            Faça login
          </Link>
        </p>
      </div>
    </div>
  );
}
