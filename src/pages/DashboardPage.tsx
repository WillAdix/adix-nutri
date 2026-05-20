import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import '../styles/dashboard.css';

interface Paciente {
  id: string;
  nome: string;
}

export function DashboardPage() {
  const { user } = useAuth();
  const [totalPacientes, setTotalPacientes] = useState<number>(0);
  const [consultasSemana, setConsultasSemana] = useState<number>(0);
  const [pacientesSemRetorno, setPacientesSemRetorno] = useState<Paciente[]>([]);
  const [loading, setLoading] = useState(true);

  const nomeUsuario = user?.user_metadata?.nome || user?.email?.split('@')[0] || 'Nutricionista';

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        // 1. Total de Pacientes Ativos
        const { count: pacientesCount } = await supabase
          .from('pacientes')
          .select('*', { count: 'exact', head: true })
          .eq('nutricionista_id', user.id);
        
        setTotalPacientes(pacientesCount || 0);

        // 2. Fetch de Pacientes para cruzar com consultas
        const { data: pacientes } = await supabase
          .from('pacientes')
          .select('id, nome')
          .eq('nutricionista_id', user.id);

        if (!pacientes || pacientes.length === 0) {
          setConsultasSemana(0);
          setPacientesSemRetorno([]);
          setLoading(false);
          return;
        }

        const pacienteIds = pacientes.map(p => p.id);

        // 3. Consultas da semana
        const now = new Date();
        const firstDay = new Date(now.setDate(now.getDate() - now.getDay())); // Domingo
        firstDay.setHours(0, 0, 0, 0);
        const lastDay = new Date(firstDay);
        lastDay.setDate(lastDay.getDate() + 6); // Sábado
        lastDay.setHours(23, 59, 59, 999);

        const { data: consultas } = await supabase
          .from('consultas')
          .select('*')
          .in('paciente_id', pacienteIds);

        let consultasSemanaCount = 0;
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const semRetorno: Paciente[] = [];

        for (const paciente of pacientes) {
          const pConsultas = consultas?.filter(c => c.paciente_id === paciente.id) || [];
          
          // Contabiliza consultas na semana
          const consultasNestaSemana = pConsultas.filter(c => {
            const cDate = new Date(c.data_consulta + 'T00:00:00');
            return cDate >= firstDay && cDate <= lastDay;
          });
          consultasSemanaCount += consultasNestaSemana.length;

          // Verifica se está sem retorno
          if (pConsultas.length > 0) {
            // Ordena descrescente pela data_consulta
            pConsultas.sort((a, b) => new Date(b.data_consulta).getTime() - new Date(a.data_consulta).getTime());
            const lastConsulta = pConsultas[0];
            const lastConsultaDate = new Date(lastConsulta.data_consulta + 'T00:00:00');

            if (lastConsultaDate < thirtyDaysAgo) {
              // Verifica se não há proximo retorno agendado
              if (!lastConsulta.proximo_retorno || new Date(lastConsulta.proximo_retorno + 'T00:00:00') < new Date()) {
                semRetorno.push(paciente);
              }
            }
          }
        }

        setConsultasSemana(consultasSemanaCount);
        setPacientesSemRetorno(semRetorno);
        setLoading(false);

      } catch (err) {
        console.error('Erro ao buscar dados do dashboard:', err);
        setLoading(false);
      }
    };

    fetchData();

    // Inscrição para Realtime
    const pacientesSub = supabase.channel('custom-pacientes-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pacientes' }, () => {
        fetchData();
      })
      .subscribe();

    const consultasSub = supabase.channel('custom-consultas-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'consultas' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(pacientesSub);
      supabase.removeChannel(consultasSub);
    };
  }, [user]);

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="welcome-badge">🌿 Bem-vinda de volta!</div>
        <h2 className="welcome-title">Olá, {nomeUsuario}!</h2>
        <p className="welcome-subtitle">Acompanhe o resumo do seu consultório hoje.</p>
      </header>

      {loading ? (
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', color: '#64748b' }}>
          <div className="loading-spinner" style={{ width: '20px', height: '20px', borderWidth: '3px' }}></div>
          Carregando dados...
        </div>
      ) : (
        <div className="dashboard-grid">
          {/* Card 1: Total de pacientes ativos */}
          <div className="dash-card">
            <div className="dash-card-header">
              <div className="dash-card-icon icon-green">👥</div>
              <h3 className="dash-card-title">Pacientes Ativos</h3>
            </div>
            <div className="dash-card-content">
              <p className="dash-card-value">{totalPacientes}</p>
            </div>
          </div>

          {/* Card 2: Consultas da semana */}
          <div className="dash-card">
            <div className="dash-card-header">
              <div className="dash-card-icon icon-blue">📅</div>
              <h3 className="dash-card-title">Consultas da Semana</h3>
            </div>
            <div className="dash-card-content">
              <p className="dash-card-value">{consultasSemana}</p>
            </div>
          </div>

          {/* Card 3: Pacientes sem retorno */}
          <div className="dash-card">
            <div className="dash-card-header">
              <div className="dash-card-icon icon-orange">⚠️</div>
              <h3 className="dash-card-title">Pacientes sem retorno</h3>
            </div>
            <div className="dash-card-content">
              {pacientesSemRetorno.length > 0 ? (
                <ul className="patients-list">
                  {pacientesSemRetorno.map(paciente => (
                    <li key={paciente.id}>
                      <Link to={`/pacientes/${paciente.id}`} className="patient-item">
                        {paciente.nome}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="empty-state">Nenhum paciente sem retorno no momento</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
