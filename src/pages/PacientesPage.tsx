import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import '../styles/pacientes.css';

interface Paciente {
  id: string;
  nome: string;
  email: string | null;
  data_nascimento: string | null;
  sexo: string | null;
  altura: number | null;
  observacoes: string | null;
  created_at: string;
  objetivos: string[] | null;
  objetivo_texto: string | null;
  consultas?: { data_consulta: string }[];
}

export function PacientesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchPacientes = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('pacientes')
        .select('*, consultas(data_consulta)')
        .eq('nutricionista_id', user.id)
        .order('nome', { ascending: true });

      if (error) throw error;
      setPacientes(data || []);
    } catch (err) {
      console.error('Erro ao buscar pacientes:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    Promise.resolve().then(() => {
      void fetchPacientes();
    });

    // Inscrição para Realtime
    const channelPacientes = supabase.channel('pacientes-list-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pacientes', filter: `nutricionista_id=eq.${user.id}` }, () => {
        void fetchPacientes();
      })
      .subscribe();

    const channelConsultas = supabase.channel('consultas-list-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'consultas' }, () => {
        void fetchPacientes();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channelPacientes);
      void supabase.removeChannel(channelConsultas);
    };
  }, [user, fetchPacientes]);

  // Filtrar pacientes por nome
  const filteredPacientes = pacientes.filter(paciente =>
    paciente.nome.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Helper para obter iniciais do nome
  const getInitials = (fullName: string) => {
    const parts = fullName.trim().split(' ');
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  // Helper para obter o objetivo principal do paciente
  const getObjetivoLabel = (paciente: Paciente) => {
    if (paciente.objetivos && paciente.objetivos.length > 0) {
      return paciente.objetivos.join(', ');
    }
    return paciente.objetivo_texto || 'Não informado';
  };

  // Helper para obter e formatar a data da última consulta
  const getLastConsultaDate = (consultasArr: { data_consulta: string }[] | null | undefined) => {
    if (!consultasArr || consultasArr.length === 0) return 'Nenhuma consulta realizada';
    // Ordena as consultas decrescente pela data
    const sorted = [...consultasArr].sort((a, b) => b.data_consulta.localeCompare(a.data_consulta));
    const [year, month, day] = sorted[0].data_consulta.split('-');
    return `${day}/${month}/${year}`;
  };

  return (
    <div className="pacientes-container">
      <header className="pacientes-header">
        <div className="header-title-area">
          <h2 className="pacientes-title">Pacientes</h2>
          <p className="pacientes-subtitle">Gerencie as fichas e prontuários de seus clientes.</p>
        </div>
        <div className="pacientes-actions">
          <div className="search-wrapper">
            <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="text"
              className="search-input"
              placeholder="Buscar paciente por nome..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <button 
            className="btn-primary" 
            onClick={() => navigate('/pacientes/novo')} 
            id="btn-novo-paciente"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Novo Paciente
          </button>
        </div>
      </header>

      {loading ? (
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', color: '#64748b' }}>
          <div className="loading-spinner" style={{ width: '20px', height: '20px', borderWidth: '3px' }}></div>
          Carregando pacientes...
        </div>
      ) : pacientes.length === 0 ? (
        <div className="dash-card" style={{ padding: '40px', alignItems: 'center', textAlign: 'center' }}>
          <span style={{ fontSize: '3rem', marginBottom: '16px' }}>👥</span>
          <h3 className="dash-card-title" style={{ fontSize: '1.25rem', marginBottom: '8px' }}>Nenhum paciente cadastrado ainda</h3>
          <p style={{ color: '#64748b', margin: '0 0 20px 0', maxWidth: '400px' }}>
            Comece cadastrando seu primeiro paciente para gerenciar consultas e acompanhar a evolução.
          </p>
          <button className="btn-primary" onClick={() => navigate('/pacientes/novo')}>
            Cadastrar Paciente
          </button>
        </div>
      ) : filteredPacientes.length === 0 ? (
        <div className="dash-card" style={{ padding: '40px', alignItems: 'center', textAlign: 'center' }}>
          <span style={{ fontSize: '3.5rem', marginBottom: '16px' }}>🔍</span>
          <h3 className="dash-card-title" style={{ fontSize: '1.25rem', marginBottom: '8px' }}>Nenhum resultado</h3>
          <p style={{ color: '#64748b', margin: '0', maxWidth: '400px' }}>
            Não encontramos nenhum paciente com o nome "{searchQuery}".
          </p>
        </div>
      ) : (
        <div className="pacientes-grid">
          {filteredPacientes.map(paciente => (
            <Link 
              key={paciente.id} 
              to={`/pacientes/${paciente.id}`} 
              className="paciente-card"
              style={{ textDecoration: 'none' }}
            >
              <div className="paciente-avatar">
                {getInitials(paciente.nome)}
              </div>
              <h3 className="paciente-nome">{paciente.nome}</h3>
              <p className="paciente-email">{paciente.email || 'Sem e-mail cadastrado'}</p>
              
              <div className="paciente-info-meta" style={{ gridTemplateColumns: '1fr', gap: '8px' }}>
                <div className="meta-item" style={{ alignItems: 'flex-start', textAlign: 'left', width: '100%' }}>
                  <span className="meta-label">Objetivo</span>
                  <span className="meta-value" style={{ wordBreak: 'break-word', whiteSpace: 'normal' }}>
                    {getObjetivoLabel(paciente)}
                  </span>
                </div>
                <div className="meta-item" style={{ alignItems: 'flex-start', textAlign: 'left', width: '100%', borderTop: '1px solid #f1f5f9', paddingTop: '8px', marginTop: '4px' }}>
                  <span className="meta-label">Última Consulta</span>
                  <span className="meta-value">
                    {getLastConsultaDate(paciente.consultas)}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
