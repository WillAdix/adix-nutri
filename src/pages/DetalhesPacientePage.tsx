import { useEffect, useState, useCallback, useMemo, type FormEvent } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { gerarInsightsPaciente, type AIInsights } from '../utils/adixAI';
import '../styles/pacientes.css';

interface Paciente {
  id: string;
  nome: string;
  email: string | null;
  data_nascimento: string | null;
  sexo: string | null;
  telefone: string | null;
  whatsapp: string | null;
  peso_inicial: number | null;
  altura: number | null;
  objetivos: string[] | null;
  objetivo_texto: string | null;
  nivel_atividade: string | null;
  patologias: string[] | null;
  restricoes_alimentares: string[] | null;
  alergias: string[] | null;
  medicamentos: string | null;
  suplementos: string | null;
  refeicoes_por_dia: number | null;
  horario_acorda: string | null;
  horario_dorme: string | null;
  litros_agua: number | null;
  atividade_fisica: boolean | null;
  atividade_fisica_descricao: string | null;
  observacoes: string | null;
  created_at: string;
}

interface Consulta {
  id: string;
  paciente_id: string;
  data_consulta: string;
  proximo_retorno: string | null;
  peso: number | null;
  percentual_gordura: number | null;
  observacoes: string | null;
  created_at: string;
}

export function DetalhesPacientePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal Consulta States
  const [isConsultaModalOpen, setIsConsultaModalOpen] = useState(false);
  const [dataConsulta, setDataConsulta] = useState(new Date().toISOString().split('T')[0]);
  const [proximoRetorno, setProximoRetorno] = useState('');
  const [peso, setPeso] = useState('');
  const [percentualGordura, setPercentualGordura] = useState('');
  const [obsConsulta, setObsConsulta] = useState('');
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');

  // Modal Exclusão State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Gráfico Interativo - Estados
  const [activeChartTab, setActiveChartTab] = useState<'peso' | 'gordura' | 'imc'>('peso');
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number; value: string; date: string } | null>(null);

  // AdixAI - Estados
  const [insights, setInsights] = useState<AIInsights | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiStep, setAiStep] = useState('');

  const fetchPacienteEConsultas = useCallback(async () => {
    if (!id || !user) return;
    try {
      // 1. Buscar paciente
      const { data: pacienteData, error: pacienteErr } = await supabase
        .from('pacientes')
        .select('*')
        .eq('id', id)
        .eq('nutricionista_id', user.id)
        .single();

      if (pacienteErr) {
        throw new Error('Paciente não encontrado ou acesso não autorizado.');
      }
      setPaciente(pacienteData);

      // 2. Buscar consultas
      const { data: consultasData, error: consultasErr } = await supabase
        .from('consultas')
        .select('*')
        .eq('paciente_id', id)
        .order('data_consulta', { ascending: false });

      if (consultasErr) throw consultasErr;
      setConsultas(consultasData || []);

    } catch (err) {
      console.error(err);
      const errMsg = err instanceof Error ? err.message : 'Erro ao carregar dados do prontuário.';
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  }, [id, user]);

  useEffect(() => {
    Promise.resolve().then(() => {
      void fetchPacienteEConsultas();
    });

    // Inscrição para Realtime
    const channelPaciente = supabase.channel(`paciente-${id}-channel`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pacientes', filter: `id=eq.${id}` }, () => {
        void fetchPacienteEConsultas();
      })
      .subscribe();

    const channelConsultas = supabase.channel(`consultas-paciente-${id}-channel`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'consultas', filter: `paciente_id=eq.${id}` }, () => {
        void fetchPacienteEConsultas();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channelPaciente);
      void supabase.removeChannel(channelConsultas);
    };
  }, [id, fetchPacienteEConsultas]);

  const handleExcluirPaciente = async () => {
    if (!paciente) return;

    try {
      setLoading(true);
      
      // Excluir primeiro as consultas (por segurança, caso não tenha delete em cascata configurado)
      const { error: errConsultas } = await supabase
        .from('consultas')
        .delete()
        .eq('paciente_id', paciente.id);

      if (errConsultas) throw errConsultas;

      // Excluir o paciente
      const { error: errPaciente } = await supabase
        .from('pacientes')
        .delete()
        .eq('id', paciente.id);

      if (errPaciente) throw errPaciente;

      setIsDeleteModalOpen(false);
      navigate('/pacientes', { replace: true });
    } catch (err) {
      console.error('Erro ao excluir paciente:', err);
      const errMsg = err instanceof Error ? err.message : 'Erro ao excluir paciente.';
      alert(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenConsultaModal = () => {
    setDataConsulta(new Date().toISOString().split('T')[0]);
    setProximoRetorno('');
    setPeso('');
    setPercentualGordura('');
    setObsConsulta('');
    setModalError('');
    setIsConsultaModalOpen(true);
  };

  const handleCloseConsultaModal = () => {
    setIsConsultaModalOpen(false);
  };

  const handleSubmitConsulta = async (e: FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setModalError('');
    setModalLoading(true);

    try {
      const numPeso = peso ? parseFloat(peso.replace(',', '.')) : null;
      const numGordura = percentualGordura ? parseFloat(percentualGordura.replace(',', '.')) : null;

      const { error: errInsert } = await supabase.from('consultas').insert({
        paciente_id: id,
        data_consulta: dataConsulta,
        proximo_retorno: proximoRetorno || null,
        peso: numPeso,
        percentual_gordura: numGordura,
        observacoes: obsConsulta.trim() || null
      });

      if (errInsert) throw errInsert;

      handleCloseConsultaModal();
      void fetchPacienteEConsultas();
      // Limpa os insights se já existirem para forçar re-geração com a nova consulta
      setInsights(null);
    } catch (err) {
      console.error('Erro ao registrar consulta:', err);
      const errMsg = err instanceof Error ? err.message : 'Erro ao registrar consulta. Verifique os dados inseridos.';
      setModalError(errMsg);
    } finally {
      setModalLoading(false);
    }
  };

  // Lógica de simulação de IA para gerar insights do prontuário
  const handleGerarAIInsights = () => {
    if (!paciente) return;
    setAiLoading(true);
    setAiStep('Analisando histórico e composição corporal...');
    
    setTimeout(() => {
      setAiStep('Cruzando restrições, alergias e patologias...');
      
      setTimeout(() => {
        setAiStep('Mapeando hábitos diários e calculando metas...');
        
        setTimeout(() => {
          const res = gerarInsightsPaciente(paciente, consultas);
          setInsights(res);
          setAiLoading(false);
        }, 700);
      }, 700);
    }, 700);
  };

  // Helper para obter iniciais do nome
  const getInitials = (fullName: string) => {
    const parts = fullName.trim().split(' ');
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  // Helper para calcular idade a partir da data de nascimento
  const calculateAge = (dateStr: string | null) => {
    if (!dateStr) return null;
    const today = new Date();
    const birthDate = new Date(dateStr);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  // Helper para formatar data (Ex: 19/05/2026)
  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  // Cálculo de IMC do paciente
  const imcPaciente = useMemo(() => {
    if (!paciente || !paciente.peso_inicial || !paciente.altura) return null;
    const p = paciente.peso_inicial;
    const a = paciente.altura / 100; // cm para metros
    return (p / (a * a)).toFixed(1);
  }, [paciente]);

  // Cálculo das Coordenadas do Gráfico de Linha SVG dinâmico
  const chartData = useMemo(() => {
    if (!paciente) return { points: [], minVal: 0, maxVal: 0, pathD: '', areaD: '', coords: [] };
    
    // Consultas em ordem cronológica (antiga -> recente)
    const consultasCron = [...consultas].reverse();

    let filtered = [];
    if (activeChartTab === 'peso') {
      filtered = consultasCron.filter(c => c.peso !== null).map(c => ({
        value: c.peso as number,
        date: formatDate(c.data_consulta),
        unit: 'kg'
      }));
    } else if (activeChartTab === 'gordura') {
      filtered = consultasCron.filter(c => c.percentual_gordura !== null).map(c => ({
        value: c.percentual_gordura as number,
        date: formatDate(c.data_consulta),
        unit: '%'
      }));
    } else {
      // IMC
      filtered = consultasCron.filter(c => c.peso !== null && paciente.altura).map(c => {
        const p = c.peso as number;
        const a = (paciente.altura as number) / 100;
        const imcVal = parseFloat((p / (a * a)).toFixed(1));
        return {
          value: imcVal,
          date: formatDate(c.data_consulta),
          unit: ''
        };
      });
    }

    if (filtered.length === 0) return { points: [], minVal: 0, maxVal: 0, pathD: '', areaD: '', coords: [] };

    const values = filtered.map(d => d.value);
    let maxVal = Math.max(...values);
    let minVal = Math.min(...values);

    // Ajusta min e max para dar uma margem bonita no gráfico
    const marginRatio = (maxVal - minVal) * 0.15 || 2;
    maxVal = maxVal + marginRatio;
    minVal = Math.max(0, minVal - marginRatio);

    const valRange = maxVal - minVal || 1;

    // Dimensões da viewBox SVG: 600 x 200
    const width = 600;
    const height = 200;
    const paddingX = 40;
    const paddingY = 30;

    const coords = filtered.map((d, i) => {
      const x = filtered.length > 1
        ? paddingX + (i / (filtered.length - 1)) * (width - 2 * paddingX)
        : width / 2;
      const y = height - paddingY - ((d.value - minVal) / valRange) * (height - 2 * paddingY);
      return { x, y, value: d.value, date: d.date, unit: d.unit };
    });

    const pathD = coords.length > 0
      ? coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ')
      : '';

    const areaD = coords.length > 0
      ? `${pathD} L ${coords[coords.length - 1].x} ${height - paddingY} L ${coords[0].x} ${height - paddingY} Z`
      : '';

    return { points: filtered, minVal, maxVal, pathD, areaD, coords };
  }, [consultas, activeChartTab, paciente]);

  if (loading && !isDeleteModalOpen) {
    return (
      <div className="pacientes-container">
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', color: '#64748b' }}>
          <div className="loading-spinner" style={{ width: '20px', height: '20px', borderWidth: '3px' }}></div>
          Carregando prontuário...
        </div>
      </div>
    );
  }

  if (error || !paciente) {
    return (
      <div className="pacientes-container">
        <div className="auth-error" style={{ marginBottom: '20px' }}>
          <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span>{error || 'Prontuário não encontrado.'}</span>
        </div>
        <Link to="/pacientes" className="btn-secondary">
          Voltar para Pacientes
        </Link>
      </div>
    );
  }

  return (
    <div className="pacientes-container">
      <header className="detalhes-header">
        <button className="btn-back" onClick={() => navigate('/pacientes')} title="Voltar para Pacientes">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="20" height="20">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
        <div className="header-title-area">
          <h2 className="pacientes-title">{paciente.nome}</h2>
          <p className="pacientes-subtitle">Prontuário e evolução clínica do paciente.</p>
        </div>
      </header>

      <div className="detalhes-layout">
        {/* Coluna Lateral - Perfil Rápido */}
        <aside className="perfil-card">
          <div className="perfil-avatar">
            {getInitials(paciente.nome)}
          </div>
          <h3 className="perfil-nome">{paciente.nome}</h3>
          <p className="perfil-email" style={{ marginBottom: '16px' }}>{paciente.email || 'Sem e-mail cadastrado'}</p>

          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid #f1f5f9', paddingTop: '16px', marginBottom: '24px', textAlign: 'left', fontSize: '0.85rem' }}>
            <div><strong>Idade:</strong> {calculateAge(paciente.data_nascimento) !== null ? `${calculateAge(paciente.data_nascimento)} anos` : 'Não informada'}</div>
            <div><strong>Sexo:</strong> {paciente.sexo || 'Não informado'}</div>
            <div><strong>WhatsApp:</strong> {paciente.whatsapp || 'Não informado'}</div>
          </div>

          <div className="perfil-actions" style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <Link to={`/pacientes/${paciente.id}/editar`} className="btn-secondary" style={{ width: '100%', display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center', textDecoration: 'none' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16" style={{ color: '#16a34a' }}>
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
              Editar Cadastro
            </Link>
            
            <button className="btn-danger" onClick={() => setIsDeleteModalOpen(true)} style={{ width: '100%', display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
              Excluir Paciente
            </button>
          </div>
        </aside>

        {/* Coluna Principal - Gráfico, Prontuário Completo e Histórico */}
        <main className="painel-principal">
          
          {/* Card de Evolução Avançado */}
          <div className="historico-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
              <h3 className="card-title" style={{ margin: 0 }}>Evolução Clínica</h3>
              <div className="chart-tabs">
                <button
                  type="button"
                  className={`chart-tab-btn ${activeChartTab === 'peso' ? 'active' : ''}`}
                  onClick={() => { setActiveChartTab('peso'); setHoveredPoint(null); }}
                >
                  Peso
                </button>
                <button
                  type="button"
                  className={`chart-tab-btn ${activeChartTab === 'gordura' ? 'active' : ''}`}
                  onClick={() => { setActiveChartTab('gordura'); setHoveredPoint(null); }}
                >
                  Gordura
                </button>
                <button
                  type="button"
                  className={`chart-tab-btn ${activeChartTab === 'imc' ? 'active' : ''}`}
                  onClick={() => { setActiveChartTab('imc'); setHoveredPoint(null); }}
                >
                  IMC
                </button>
              </div>
            </div>

            {chartData.coords.length > 0 ? (
              <div className="svg-chart-container" style={{ position: 'relative' }}>
                <svg viewBox="0 0 600 200" width="100%" height="100%" style={{ overflow: 'visible' }}>
                  <defs>
                    <linearGradient id="chartAreaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22c55e" stopOpacity="0.2" />
                      <stop offset="100%" stopColor="#22c55e" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Grid Lines Horizontais */}
                  {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
                    const y = 30 + ratio * 140; // 30 (paddingY) a 170 (height - paddingY)
                    const val = chartData.maxVal - ratio * (chartData.maxVal - chartData.minVal);
                    return (
                      <g key={index}>
                        <line
                          x1="40"
                          y1={y}
                          x2="560"
                          y2={y}
                          stroke="#f1f5f9"
                          strokeWidth="1.5"
                        />
                        <text
                          x="12"
                          y={y + 3.5}
                          fontSize="9.5"
                          fill="#94a3b8"
                          fontWeight="600"
                          textAnchor="start"
                        >
                          {val.toFixed(1)}
                        </text>
                      </g>
                    );
                  })}

                  {/* Linha e Área do Gráfico */}
                  {chartData.coords.length > 1 && (
                    <>
                      <path
                        d={chartData.areaD}
                        fill="url(#chartAreaGradient)"
                      />
                      <path
                        d={chartData.pathD}
                        fill="none"
                        stroke="#16a34a"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </>
                  )}

                  {/* Pontos de dados */}
                  {chartData.coords.map((c, i) => (
                    <circle
                      key={i}
                      cx={c.x}
                      cy={c.y}
                      r="5.5"
                      fill="#ffffff"
                      stroke="#16a34a"
                      strokeWidth="3"
                      className="chart-dot"
                      onMouseEnter={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const svgRect = e.currentTarget.ownerSVGElement?.getBoundingClientRect();
                        if (rect && svgRect) {
                          setHoveredPoint({
                            x: rect.left - svgRect.left + rect.width / 2,
                            y: rect.top - svgRect.top,
                            value: `${c.value} ${c.unit}`,
                            date: c.date
                          });
                        }
                      }}
                      onMouseLeave={() => setHoveredPoint(null)}
                    />
                  ))}

                  {/* Legendas de Data no Eixo X */}
                  {chartData.coords.length > 0 && (() => {
                    const step = Math.max(1, Math.ceil(chartData.coords.length / 5));
                    return chartData.coords.filter((_, i) => i % step === 0).map((c, i) => (
                      <text
                        key={i}
                        x={c.x}
                        y="190"
                        fontSize="9.5"
                        fill="#94a3b8"
                        fontWeight="600"
                        textAnchor="middle"
                      >
                        {c.date}
                      </text>
                    ));
                  })()}
                </svg>

                {/* Tooltip Dinâmico */}
                {hoveredPoint && (
                  <div
                    className="chart-tooltip"
                    style={{
                      left: `${hoveredPoint.x}px`,
                      top: `${hoveredPoint.y}px`
                    }}
                  >
                    <strong>{hoveredPoint.value}</strong>
                    <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '2px' }}>
                      {hoveredPoint.date}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="empty-state">
                {chartData.points.length === 1 
                  ? 'É necessária mais de uma consulta registrada para visualizar a linha de evolução clínica.' 
                  : 'Nenhuma consulta com dados registrados para esta métrica.'}
              </p>
            )}
          </div>

          {/* Seção AdixAI — Insights Clínicos */}
          <div className="adix-ai-card">
            <div className="adix-ai-title">
              <div className="adix-ai-pulse" />
              <span>AdixAI — Assistente Clínico Inteligente</span>
            </div>
            
            <p style={{ margin: '0 0 16px 0', fontSize: '0.92rem', color: '#ecfdf5', lineHeight: '1.5' }}>
              Nosso assistente de IA cruza os dados do prontuário, composição corporal corporal inicial, patologias e restrições para propor um plano estratégico focado no objetivo de <strong>{paciente.objetivos?.join(', ') || paciente.objetivo_texto || 'Saúde geral'}</strong>.
            </p>

            {aiLoading ? (
              <div className="adix-ai-loader">
                <div className="adix-ai-spinner" />
                <span style={{ fontSize: '0.9rem', color: '#a7f3d0', fontWeight: 600 }}>{aiStep}</span>
              </div>
            ) : insights ? (
              <div style={{ animation: 'fadeIn 0.3s ease' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid rgba(255, 255, 255, 0.15)', paddingBottom: '12px' }}>
                  <span style={{ fontSize: '0.85rem', color: '#a7f3d0', fontWeight: 600 }}>Insights Clínicos Computados</span>
                  <button 
                    onClick={handleGerarAIInsights} 
                    style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', fontSize: '0.8rem', textDecoration: 'underline', fontWeight: 600 }}
                  >
                    Atualizar Análise
                  </button>
                </div>

                <div className="adix-ai-insights-container">
                  {/* Diretrizes Alimentares */}
                  <div className="adix-ai-block">
                    <h4 className="adix-ai-block-title">
                      🍎 Diretrizes Alimentares
                    </h4>
                    <ul className="adix-ai-list">
                      {insights.recomNutri.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Hábitos e Hidratação */}
                  <div className="adix-ai-block">
                    <h4 className="adix-ai-block-title">
                      💧 Hábitos & Hidratação
                    </h4>
                    <ul className="adix-ai-list">
                      {insights.recomHabitos.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Plano de Ação Prático */}
                  <div className="adix-ai-block">
                    <h4 className="adix-ai-block-title">
                      🎯 Plano de Ação Sugerido
                    </h4>
                    <ul className="adix-ai-list">
                      {insights.planoAcao.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Seção de Alertas Clínicos */}
                {insights.alertasSaude.length > 0 && (
                  <div style={{ marginTop: '16px', padding: '14px 18px', backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '12px' }}>
                    <h4 style={{ margin: '0 0 8px 0', fontSize: '0.95rem', fontWeight: 700, color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      ⚠️ Alertas & Atenção Clínica
                    </h4>
                    <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.88rem', color: '#fee2e2', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {insights.alertasSaude.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <button onClick={handleGerarAIInsights} className="adix-ai-btn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18" style={{ marginRight: '6px' }}>
                  <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                  <polyline points="2 17 12 22 22 17"></polyline>
                  <polyline points="2 12 12 17 22 12"></polyline>
                </svg>
                Gerar Insights do Prontuário
              </button>
            )}
          </div>

          {/* Card do Prontuário Completo */}
          <div className="historico-card">
            <h3 className="card-title" style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="20" height="20" style={{ color: '#16a34a' }}>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
              Prontuário e Ficha do Paciente
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
              
              {/* Seção Pessoal */}
              <div style={{ border: '1px solid #f1f5f9', borderRadius: '12px', padding: '16px', backgroundColor: '#f8fafc' }}>
                <h4 style={{ margin: '0 0 12px 0', color: '#1e293b', fontSize: '0.95rem', fontWeight: 700, borderBottom: '2px solid #e2e8f0', paddingBottom: '6px' }}>
                  Informações Pessoais
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.9rem', color: '#475569' }}>
                  <div><strong>Sexo:</strong> {paciente.sexo || 'Não informado'}</div>
                  <div><strong>Idade:</strong> {calculateAge(paciente.data_nascimento) !== null ? `${calculateAge(paciente.data_nascimento)} anos` : 'Não informada'}</div>
                  <div><strong>Data Nasc.:</strong> {paciente.data_nascimento ? formatDate(paciente.data_nascimento) : 'Não informada'}</div>
                  <div><strong>E-mail:</strong> {paciente.email || 'Não cadastrado'}</div>
                  <div><strong>Telefone:</strong> {paciente.telefone || 'Não cadastrado'}</div>
                  <div><strong>WhatsApp:</strong> {paciente.whatsapp || 'Não cadastrado'}</div>
                </div>
              </div>

              {/* Seção Clínica */}
              <div style={{ border: '1px solid #f1f5f9', borderRadius: '12px', padding: '16px', backgroundColor: '#f8fafc' }}>
                <h4 style={{ margin: '0 0 12px 0', color: '#1e293b', fontSize: '0.95rem', fontWeight: 700, borderBottom: '2px solid #e2e8f0', paddingBottom: '6px' }}>
                  Dados Clínicos
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.9rem', color: '#475569' }}>
                  <div><strong>Peso Inicial:</strong> {paciente.peso_inicial ? `${paciente.peso_inicial} kg` : 'Não informado'}</div>
                  <div><strong>Altura:</strong> {paciente.altura ? `${paciente.altura} cm` : 'Não informada'}</div>
                  <div><strong>IMC Inicial:</strong> {imcPaciente ? `${imcPaciente} (${parseFloat(imcPaciente) < 18.5 ? 'Abaixo do peso' : parseFloat(imcPaciente) < 25 ? 'Peso normal' : parseFloat(imcPaciente) < 30 ? 'Sobrepeso' : 'Obesidade'})` : 'Não calculado'}</div>
                  <div><strong>Nível Atividade:</strong> {paciente.nivel_atividade || 'Não informado'}</div>
                  <div><strong>Objetivos:</strong> {paciente.objetivos?.join(', ') || paciente.objetivo_texto || 'Não informados'}</div>
                </div>
              </div>

              {/* Condições e Hábitos */}
              <div style={{ border: '1px solid #f1f5f9', borderRadius: '12px', padding: '16px', backgroundColor: '#f8fafc' }}>
                <h4 style={{ margin: '0 0 12px 0', color: '#1e293b', fontSize: '0.95rem', fontWeight: 700, borderBottom: '2px solid #e2e8f0', paddingBottom: '6px' }}>
                  Histórico & Hábitos
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.9rem', color: '#475569' }}>
                  <div><strong>Patologias:</strong> {paciente.patologias?.join(', ') || 'Nenhuma'}</div>
                  <div><strong>Restrições:</strong> {paciente.restricoes_alimentares?.join(', ') || 'Nenhuma'}</div>
                  <div><strong>Alergias:</strong> {paciente.alergias?.join(', ') || 'Nenhuma'}</div>
                  <div><strong>Consumo Água:</strong> {paciente.litros_agua ? `${paciente.litros_agua} litros/dia` : 'Não informado'}</div>
                  <div><strong>Refeições/dia:</strong> {paciente.refeicoes_por_dia || 'Não informado'}</div>
                  <div><strong>Acorda/Dorme:</strong> {paciente.horario_acorda && paciente.horario_dorme ? `${paciente.horario_acorda} às ${paciente.horario_dorme}` : 'Não informado'}</div>
                </div>
              </div>

            </div>
            
            {/* Observações, Suplementos e Medicamentos */}
            <div style={{ marginTop: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', fontSize: '0.9rem' }}>
              {paciente.medicamentos && (
                <div style={{ padding: '12px', border: '1px solid #fee2e2', borderRadius: '10px', backgroundColor: '#fff5f5' }}>
                  <strong style={{ color: '#991b1b' }}>💊 Medicamentos Contínuos:</strong>
                  <div style={{ marginTop: '4px', color: '#475569' }}>{paciente.medicamentos}</div>
                </div>
              )}
              {paciente.suplementos && (
                <div style={{ padding: '12px', border: '1px solid #e0f2fe', borderRadius: '10px', backgroundColor: '#f0f9ff' }}>
                  <strong style={{ color: '#075985' }}>🥛 Suplementos em Uso:</strong>
                  <div style={{ marginTop: '4px', color: '#475569' }}>{paciente.suplementos}</div>
                </div>
              )}
              {paciente.atividade_fisica && (
                <div style={{ padding: '12px', border: '1px solid #dcfce7', borderRadius: '10px', backgroundColor: '#f0fdf4' }}>
                  <strong style={{ color: '#166534' }}>🏃 Atividade Física:</strong>
                  <div style={{ marginTop: '4px', color: '#475569' }}>{paciente.atividade_fisica_descricao}</div>
                </div>
              )}
            </div>

            {paciente.observacoes && (
              <div style={{ marginTop: '16px', padding: '12px', border: '1px solid #f1f5f9', borderRadius: '10px', backgroundColor: '#fafafa', fontSize: '0.9rem' }}>
                <strong>📝 Observações Gerais:</strong>
                <div style={{ marginTop: '4px', color: '#475569', whiteSpace: 'pre-wrap' }}>{paciente.observacoes}</div>
              </div>
            )}
          </div>

          {/* Histórico de Consultas */}
          <div className="historico-card">
            <div className="card-header-btn">
              <h3 className="card-title">Histórico de Consultas</h3>
              <button className="btn-primary" onClick={handleOpenConsultaModal} id="btn-nova-consulta">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Registrar Consulta
              </button>
            </div>

            {consultas.length === 0 ? (
              <p className="empty-state">Nenhuma consulta registrada para este paciente.</p>
            ) : (
              <div className="timeline">
                {consultas.map((consulta, index) => (
                  <div key={consulta.id} className="timeline-item">
                    <div className="timeline-dot">
                      {consultas.length - index}
                    </div>
                    <div className="timeline-content">
                      <div className="timeline-header">
                        <span className="timeline-date">Consulta em {formatDate(consulta.data_consulta)}</span>
                        {consulta.proximo_retorno && (
                          <span className="timeline-next-retorno">
                            Retorno: {formatDate(consulta.proximo_retorno)}
                          </span>
                        )}
                      </div>

                      <div className="timeline-metrics">
                        {consulta.peso !== null && (
                          <div className="metric-pill">
                            Peso: <span>{consulta.peso} kg</span>
                          </div>
                        )}
                        {consulta.percentual_gordura !== null && (
                          <div className="metric-pill">
                            Gordura: <span>{consulta.percentual_gordura}%</span>
                          </div>
                        )}
                      </div>

                      {consulta.observacoes ? (
                        <p className="timeline-notes">{consulta.observacoes}</p>
                      ) : (
                        <p className="timeline-notes" style={{ color: '#94a3b8', fontStyle: 'italic' }}>
                          Sem anotações registradas.
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </main>
      </div>

      {/* Modal Registrar Consulta */}
      {isConsultaModalOpen && (
        <div className="modal-overlay" onClick={handleCloseConsultaModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={handleCloseConsultaModal} aria-label="Fechar modal">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
            <h3 className="modal-title">Registrar Consulta</h3>

            {modalError && (
              <div className="auth-error" style={{ marginBottom: '20px' }}>
                <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitConsulta} className="auth-form" id="create-consulta-form">
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label" htmlFor="consulta-data">Data da Consulta</label>
                  <input
                    type="date"
                    id="consulta-data"
                    className="form-input"
                    value={dataConsulta}
                    onChange={e => setDataConsulta(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="consulta-retorno">Próximo Retorno (Opcional)</label>
                  <input
                    type="date"
                    id="consulta-retorno"
                    className="form-input"
                    value={proximoRetorno}
                    onChange={e => setProximoRetorno(e.target.value)}
                    min={dataConsulta}
                  />
                </div>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label" htmlFor="consulta-peso">Peso (kg)</label>
                  <input
                    type="text"
                    id="consulta-peso"
                    className="form-input"
                    placeholder="Ex: 68.5"
                    value={peso}
                    onChange={e => setPeso(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="consulta-gordura">% de Gordura (Opcional)</label>
                  <input
                    type="text"
                    id="consulta-gordura"
                    className="form-input"
                    placeholder="Ex: 22.4"
                    value={percentualGordura}
                    onChange={e => setPercentualGordura(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="consulta-obs">Anamnese e Observações</label>
                <textarea
                  id="consulta-obs"
                  className="textarea-field"
                  placeholder="Queixas, recordatório alimentar, plano proposto..."
                  value={obsConsulta}
                  onChange={e => setObsConsulta(e.target.value)}
                  style={{ minHeight: '120px' }}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={handleCloseConsultaModal}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={modalLoading}>
                  {modalLoading ? 'Salvando...' : 'Salvar Consulta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirmação de Exclusão Premium */}
      {isDeleteModalOpen && (
        <div className="modal-overlay" onClick={() => setIsDeleteModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px' }}>
            <button className="modal-close" onClick={() => setIsDeleteModalOpen(false)} aria-label="Fechar modal">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
            
            <div style={{ textAlign: 'center', padding: '10px 0 10px 0' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto', color: '#dc2626' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="28" height="28">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
              </div>
              
              <h3 className="modal-title" style={{ color: '#1e293b', marginBottom: '8px' }}>Excluir Paciente</h3>
              <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: '1.5', margin: '0 0 24px 0' }}>
                Tem certeza de que deseja excluir o prontuário de <strong>{paciente.nome}</strong>?
                <br />
                Todos os dados, ficha clínica, hábitos e consultas serão removidos permanentemente. Esta ação não poderá ser desfeita.
              </p>
              
              <div className="modal-actions" style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button 
                  type="button" 
                  className="btn-secondary" 
                  onClick={() => setIsDeleteModalOpen(false)}
                  disabled={loading}
                  style={{ flex: 1 }}
                >
                  Cancelar
                </button>
                <button 
                  type="button" 
                  className="btn-danger" 
                  onClick={handleExcluirPaciente}
                  disabled={loading}
                  style={{ flex: 1, backgroundColor: '#dc2626' }}
                >
                  {loading ? 'Excluindo...' : 'Sim, Excluir'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
