import { useState, useMemo, useEffect, type FormEvent } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import '../styles/pacientes.css';

type Tab = 'pessoal' | 'clinico' | 'habitos';

export function CadastroPacientePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id;

  // Estado da aba ativa
  const [activeTab, setActiveTab] = useState<Tab>('pessoal');
  
  // Estados de feedback
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // --- ABA 1: PESSOAL ---
  const [nome, setNome] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [sexo, setSexo] = useState('Feminino');
  const [telefone, setTelefone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');

  // --- ABA 2: CLÍNICO ---
  const [peso, setPeso] = useState('');
  const [altura, setAltura] = useState('');
  const [objetivos, setObjetivos] = useState<string[]>([]);
  const [objetivoTexto, setObjetivoTexto] = useState('');
  const [nivelAtividade, setNivelAtividade] = useState('Sedentário');
  
  const [patologias, setPatologias] = useState<string[]>([]);
  const [patologiasLivre, setPatologiasLivre] = useState('');
  
  const [restricoesAlimentares, setRestricoesAlimentares] = useState<string[]>([]);
  const [restricoesLivre, setRestricoesLivre] = useState('');

  const [alergias, setAlergias] = useState<string[]>([]);
  const [alergiasLivre, setAlergiasLivre] = useState('');

  const [medicamentos, setMedicamentos] = useState('');
  const [suplementos, setSuplementos] = useState('');

  // --- ABA 3: HÁBITOS ---
  const [refeicoesPorDia, setRefeicoesPorDia] = useState('');
  const [horarioAcorda, setHorarioAcorda] = useState('');
  const [horarioDorme, setHorarioDorme] = useState('');
  const [litrosAgua, setLitrosAgua] = useState('');
  const [praticaAtividade, setPraticaAtividade] = useState(false);
  const [atividadeDesc, setAtividadeDesc] = useState('');
  const [observacoes, setObservacoes] = useState('');

  // --- MÉTODOS DE FORMATAÇÃO E CÁLCULO ---

  // Buscar dados caso esteja no modo de edição
  useEffect(() => {
    if (!isEditMode || !user || !id) return;

    const fetchPacienteDados = async () => {
      try {
        setFetchingData(true);
        const { data, error: errFetch } = await supabase
          .from('pacientes')
          .select('*')
          .eq('id', id)
          .eq('nutricionista_id', user.id)
          .single();

        if (errFetch) throw errFetch;
        if (data) {
          setNome(data.nome || '');
          setDataNascimento(data.data_nascimento || '');
          setSexo(data.sexo || 'Feminino');
          setTelefone(data.telefone || '');
          setWhatsapp(data.whatsapp || '');
          setEmail(data.email || '');

          setPeso(data.peso_inicial ? data.peso_inicial.toString() : '');
          setAltura(data.altura ? data.altura.toString() : '');
          setObjetivos(data.objetivos || []);
          setObjetivoTexto(data.objetivo_texto || '');
          setNivelAtividade(data.nivel_atividade || 'Sedentário');

          // Filtrar patologias conhecidas e livre
          const listPat = data.patologias || [];
          const knownPat = ['Diabetes', 'Hipertensão', 'Hipotireoidismo', 'Hipertireoidismo', 'Síndrome do ovário policístico', 'Doença celíaca', 'Colesterol alto', 'Nenhum'];
          const patSelected = listPat.filter((p: string) => knownPat.includes(p));
          const patLivre = listPat.filter((p: string) => !knownPat.includes(p));
          setPatologias(patSelected);
          setPatologiasLivre(patLivre.join(', '));

          // Filtrar restrições conhecidas e livre
          const listRest = data.restricoes_alimentares || [];
          const knownRest = ['Lactose', 'Glúten', 'Açúcar', 'Carne vermelha', 'Frutos do mar', 'Nenhum'];
          const restSelected = listRest.filter((r: string) => knownRest.includes(r));
          const restLivre = listRest.filter((r: string) => !knownRest.includes(r));
          setRestricoesAlimentares(restSelected);
          setRestricoesLivre(restLivre.join(', '));

          // Filtrar alergias conhecidas e livre
          const listAle = data.alergias || [];
          const knownAle = ['Amendoim', 'Leite', 'Ovo', 'Soja', 'Trigo', 'Frutos do mar', 'Nenhum'];
          const aleSelected = listAle.filter((a: string) => knownAle.includes(a));
          const aleLivre = listAle.filter((a: string) => !knownAle.includes(a));
          setAlergias(aleSelected);
          setAlergiasLivre(aleLivre.join(', '));

          setMedicamentos(data.medicamentos || '');
          setSuplementos(data.suplementos || '');

          setRefeicoesPorDia(data.refeicoes_por_dia ? data.refeicoes_por_dia.toString() : '');
          setHorarioAcorda(data.horario_acorda || '');
          setHorarioDorme(data.horario_dorme || '');
          setLitrosAgua(data.litros_agua ? data.litros_agua.toString() : '');
          
          setPraticaAtividade(!!data.atividade_fisica);
          setAtividadeDesc(data.atividade_fisica_descricao || '');
          setObservacoes(data.observacoes || '');
        }
      } catch (err) {
        console.error('Erro ao buscar dados do paciente para edição:', err);
        setError('Erro ao carregar dados do paciente para edição.');
      } finally {
        setFetchingData(false);
      }
    };

    void fetchPacienteDados();
  }, [id, isEditMode, user]);

  // Máscara de Telefone: (XX) XXXXX-XXXX
  const handlePhoneChange = (val: string, type: 'tel' | 'whats') => {
    const digits = val.replace(/\D/g, '');
    let formatted = digits;
    if (digits.length > 2) {
      const ddd = digits.substring(0, 2);
      const rest = digits.substring(2);
      if (rest.length > 5) {
        formatted = `(${ddd}) ${rest.substring(0, 5)}-${rest.substring(5, 9)}`;
      } else if (rest.length > 0) {
        formatted = `(${ddd}) ${rest}`;
      } else {
        formatted = `(${ddd}`;
      }
    } else if (digits.length > 0) {
      formatted = `(${digits}`;
    }
    
    if (type === 'tel') setTelefone(formatted);
    else setWhatsapp(formatted);
  };

  // Cálculo da Idade
  const idade = useMemo(() => {
    if (!dataNascimento) return null;
    const today = new Date();
    const birthDate = new Date(dataNascimento);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }, [dataNascimento]);

  // Cálculo do IMC
  const imc = useMemo(() => {
    if (!peso || !altura) return null;
    const p = parseFloat(peso.replace(',', '.'));
    const a = parseFloat(altura.replace(',', '.')) / 100; // cm para metros
    if (isNaN(p) || isNaN(a) || a === 0) return null;
    return (p / (a * a)).toFixed(1);
  }, [peso, altura]);

  // Formatação de Horário no Blur (Ex: 6 -> 06:00, 630 -> 06:30, 2230 -> 22:30)
  const handleTimeBlur = (value: string, setter: (v: string) => void) => {
    const digits = value.replace(/\D/g, '');
    if (!digits) return;

    const num = parseInt(digits, 10);
    if (isNaN(num)) return;

    let finalTime = value;

    if (digits.length <= 2) {
      if (num >= 0 && num < 24) {
        finalTime = `${num.toString().padStart(2, '0')}:00`;
      }
    } else if (digits.length === 3) {
      const h = parseInt(digits.substring(0, 1), 10);
      const m = parseInt(digits.substring(1, 3), 10);
      if (h >= 0 && h < 24 && m >= 0 && m < 60) {
        finalTime = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      }
    } else if (digits.length === 4) {
      const h = parseInt(digits.substring(0, 2), 10);
      const m = parseInt(digits.substring(2, 4), 10);
      if (h >= 0 && h < 24 && m >= 0 && m < 60) {
        finalTime = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      }
    }

    setter(finalTime);
  };

  // --- LÓGICA DE EXCLUSÃO MÚTUA "NENHUM" ---
  const handleCheckboxChange = (
    item: string,
    currentList: string[],
    setList: (list: string[]) => void
  ) => {
    if (item === 'Nenhum') {
      // Se selecionou "Nenhum", limpa todo o restante
      if (currentList.includes('Nenhum')) {
        setList([]);
      } else {
        setList(['Nenhum']);
      }
    } else {
      // Se selecionou qualquer outro, remove "Nenhum" da lista
      let updated = [...currentList];
      if (updated.includes('Nenhum')) {
        updated = updated.filter(x => x !== 'Nenhum');
      }

      if (updated.includes(item)) {
        updated = updated.filter(x => x !== item);
      } else {
        updated.push(item);
      }
      setList(updated);
    }
  };

  // --- ENVIO DO FORMULÁRIO ---
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError('');
    setSuccessMsg('');
    setLoading(true);

    if (!nome.trim()) {
      setError('O nome completo do paciente é obrigatório.');
      setActiveTab('pessoal');
      setLoading(false);
      return;
    }

    try {
      const numPeso = peso ? parseFloat(peso.replace(',', '.')) : null;
      const numAltura = altura ? parseFloat(altura.replace(',', '.')) : null;
      const numLitros = litrosAgua ? parseFloat(litrosAgua.replace(',', '.')) : null;
      const numRefeicoes = refeicoesPorDia ? parseInt(refeicoesPorDia, 10) : null;

      // Junta as listas de livre com as selecionadas
      const patologiasCompleto = [...patologias];
      if (patologiasLivre.trim() && !patologiasCompleto.includes('Nenhum')) {
        patologiasCompleto.push(patologiasLivre.trim());
      }
      
      const restricoesCompleto = [...restricoesAlimentares];
      if (restricoesLivre.trim() && !restricoesCompleto.includes('Nenhum')) {
        restricoesCompleto.push(restricoesLivre.trim());
      }

      const alergiasCompleto = [...alergias];
      if (alergiasLivre.trim() && !alergiasCompleto.includes('Nenhum')) {
        alergiasCompleto.push(alergiasLivre.trim());
      }

      const payload = {
        nome: nome.trim(),
        data_nascimento: dataNascimento || null,
        sexo: sexo || null,
        telefone: telefone.trim() || null,
        whatsapp: whatsapp.trim() || null,
        email: email.trim() || null,
        peso_inicial: numPeso,
        altura: numAltura,
        objetivos: objetivos.length > 0 ? objetivos : null,
        objetivo_texto: objetivoTexto.trim() || null,
        nivel_atividade: nivelAtividade || null,
        patologias: patologiasCompleto.length > 0 ? patologiasCompleto : null,
        restricoes_alimentares: restricoesCompleto.length > 0 ? restricoesCompleto : null,
        alergias: alergiasCompleto.length > 0 ? alergiasCompleto : null,
        medicamentos: medicamentos.trim() || null,
        suplementos: suplementos.trim() || null,
        refeicoes_por_dia: numRefeicoes,
        horario_acorda: horarioAcorda || null,
        horario_dorme: horarioDorme || null,
        litros_agua: numLitros,
        atividade_fisica: praticaAtividade,
        atividade_fisica_descricao: praticaAtividade ? atividadeDesc.trim() : null,
        observacoes: observacoes.trim() || null
      };

      if (isEditMode && id) {
        // Modo Edição (Update)
        const { error: errUpdate } = await supabase
          .from('pacientes')
          .update(payload)
          .eq('id', id)
          .eq('nutricionista_id', user.id);

        if (errUpdate) throw errUpdate;

        setSuccessMsg('Alterações salvas com sucesso! Redirecionando...');

        setTimeout(() => {
          navigate(`/pacientes/${id}`);
        }, 1500);
      } else {
        // Modo Cadastro (Insert)
        const { data, error: errInsert } = await supabase
          .from('pacientes')
          .insert({
            ...payload,
            nutricionista_id: user.id
          })
          .select('id')
          .single();

        if (errInsert) throw errInsert;

        setSuccessMsg('Paciente cadastrado com sucesso! Redirecionando...');
        
        setTimeout(() => {
          if (data?.id) {
            navigate(`/pacientes/${data.id}`);
          } else {
            navigate('/pacientes');
          }
        }, 1500);
      }

    } catch (err) {
      console.error(err);
      const errorMsg = err instanceof Error ? err.message : 'Erro ao salvar alterações. Verifique os campos e tente novamente.';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const OBJETIVOS_OPCOES = [
    'Emagrecer',
    'Ganhar massa',
    'Controlar diabetes',
    'Saúde geral',
    'Performance esportiva',
    'Reeducação alimentar'
  ];

  const PATOLOGIAS_OPCOES = [
    'Diabetes',
    'Hipertensão',
    'Hipotireoidismo',
    'Hipertireoidismo',
    'Síndrome do ovário policístico',
    'Doença celíaca',
    'Colesterol alto'
  ];

  const RESTRICOES_OPCOES = [
    'Lactose',
    'Glúten',
    'Açúcar',
    'Carne vermelha',
    'Frutos do mar'
  ];

  const ALERGIAS_OPCOES = [
    'Amendoim',
    'Leite',
    'Ovo',
    'Soja',
    'Trigo',
    'Frutos do mar'
  ];

  if (fetchingData) {
    return (
      <div className="pacientes-container">
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', color: '#64748b' }}>
          <div className="loading-spinner" style={{ width: '20px', height: '20px', borderWidth: '3px' }}></div>
          Carregando dados do paciente...
        </div>
      </div>
    );
  }

  return (
    <div className="pacientes-container">
      <header className="detalhes-header">
        <button className="btn-back" onClick={() => navigate(isEditMode ? `/pacientes/${id}` : '/pacientes')} title="Voltar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="20" height="20">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
        <div className="header-title-area">
          <h2 className="pacientes-title">{isEditMode ? `Editar Cadastro: ${nome}` : 'Cadastrar Novo Paciente'}</h2>
          <p className="pacientes-subtitle">
            {isEditMode ? 'Atualize as informações do prontuário do paciente.' : 'Preencha as informações do prontuário inicial.'}
          </p>
        </div>
      </header>

      {successMsg && (
        <div className="toast-success">
          <svg viewBox="0 0 20 20" fill="currentColor" width="20" height="20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
          </svg>
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="auth-error" style={{ marginBottom: '24px' }}>
          <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      <div className="cadastro-container">
        {/* Navegação de Abas */}
        <div className="form-tabs">
          <button
            type="button"
            className={`tab-btn ${activeTab === 'pessoal' ? 'active' : ''}`}
            onClick={() => setActiveTab('pessoal')}
          >
            Pessoal
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'clinico' ? 'active' : ''}`}
            onClick={() => setActiveTab('clinico')}
          >
            Clínico
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'habitos' ? 'active' : ''}`}
            onClick={() => setActiveTab('habitos')}
          >
            Hábitos
          </button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          
          {/* ================= ABA 1: PESSOAL ================= */}
          <div className={`tab-content ${activeTab === 'pessoal' ? 'active' : ''}`}>
            <div className="form-group">
              <label className="form-label" htmlFor="nome">Nome Completo *</label>
              <input
                type="text"
                id="nome"
                className="form-input"
                placeholder="Ex: Maria Silva"
                value={nome}
                onChange={e => setNome(e.target.value)}
                required
              />
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label" htmlFor="nascimento">Data de Nascimento</label>
                <input
                  type="date"
                  id="nascimento"
                  className="form-input"
                  value={dataNascimento}
                  onChange={e => setDataNascimento(e.target.value)}
                />
                {idade !== null && (
                  <span style={{ fontSize: '0.85rem', color: '#16a34a', fontWeight: 600, marginTop: '4px', display: 'block' }}>
                    Idade Calculada: {idade} anos
                  </span>
                )}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="sexo">Sexo</label>
                <select
                  id="sexo"
                  className="input-select"
                  value={sexo}
                  onChange={e => setSexo(e.target.value)}
                >
                  <option value="Feminino">Feminino</option>
                  <option value="Masculino">Masculino</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label" htmlFor="telefone">Telefone</label>
                <input
                  type="tel"
                  id="telefone"
                  className="form-input"
                  placeholder="(99) 99999-9999"
                  value={telefone}
                  onChange={e => handlePhoneChange(e.target.value, 'tel')}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="whatsapp">WhatsApp</label>
                <input
                  type="tel"
                  id="whatsapp"
                  className="form-input"
                  placeholder="(99) 99999-9999"
                  value={whatsapp}
                  onChange={e => handlePhoneChange(e.target.value, 'whats')}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="email">E-mail</label>
              <input
                type="email"
                id="email"
                className="form-input"
                placeholder="email@exemplo.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
          </div>

          {/* ================= ABA 2: CLÍNICO ================= */}
          <div className={`tab-content ${activeTab === 'clinico' ? 'active' : ''}`}>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label" htmlFor="peso">Peso Atual (kg)</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    id="peso"
                    className="form-input"
                    placeholder="Ex: 72.5"
                    value={peso}
                    onChange={e => setPeso(e.target.value)}
                    style={{ paddingRight: '40px' }}
                  />
                  <span style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontWeight: 600, fontSize: '0.9rem' }}>
                    kg
                  </span>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="altura">Altura (cm)</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    id="altura"
                    className="form-input"
                    placeholder="Ex: 172"
                    value={altura}
                    onChange={e => setAltura(e.target.value)}
                    style={{ paddingRight: '40px' }}
                  />
                  <span style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontWeight: 600, fontSize: '0.9rem' }}>
                    cm
                  </span>
                </div>
              </div>
            </div>

            {imc !== null && (
              <div className="imc-display" style={{ marginBottom: '24px' }}>
                <span>Índice de Massa Corporal (IMC):</span>
                <span className="imc-value">{imc}</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 'normal', color: '#166534' }}>
                  ({parseFloat(imc) < 18.5 ? 'Abaixo do peso' : parseFloat(imc) < 25 ? 'Peso normal' : parseFloat(imc) < 30 ? 'Sobrepeso' : 'Obesidade'})
                </span>
              </div>
            )}

            {/* Objetivos */}
            <div className="form-group">
              <label className="checkbox-group-title">Objetivos (Múltipla escolha)</label>
              <div className="options-grid">
                {OBJETIVOS_OPCOES.map(obj => (
                  <label key={obj} className={`option-checkbox-label ${objetivos.includes(obj) ? 'selected' : ''}`}>
                    <input
                      type="checkbox"
                      checked={objetivos.includes(obj)}
                      onChange={() => {
                        if (objetivos.includes(obj)) {
                          setObjetivos(objetivos.filter(x => x !== obj));
                        } else {
                          setObjetivos([...objetivos, obj]);
                        }
                      }}
                    />
                    {obj}
                  </label>
                ))}
              </div>
              <div className="additional-input-group">
                <label className="form-label" htmlFor="objetivoTexto">Objetivo Adicional (Texto livre)</label>
                <input
                  type="text"
                  id="objetivoTexto"
                  className="form-input"
                  placeholder="Descreva outro objetivo, se houver"
                  value={objetivoTexto}
                  onChange={e => setObjetivoTexto(e.target.value)}
                />
              </div>
            </div>

            {/* Nível de Atividade */}
            <div className="form-group">
              <label className="form-label" htmlFor="nivelAtividade">Nível de Atividade Física</label>
              <select
                id="nivelAtividade"
                className="input-select"
                value={nivelAtividade}
                onChange={e => setNivelAtividade(e.target.value)}
              >
                <option value="Sedentário">Sedentário</option>
                <option value="Levemente active">Levemente ativo</option>
                <option value="Moderadamente ativo">Moderadamente ativo</option>
                <option value="Muito ativo">Muito ativo</option>
                <option value="Extremamente ativo">Extremamente ativo</option>
              </select>
            </div>

            {/* Patologias */}
            <div className="form-group">
              <label className="checkbox-group-title">Patologias ou Condições de Saúde</label>
              <div className="options-grid">
                <label className={`option-checkbox-label ${patologias.includes('Nenhum') ? 'selected' : ''}`}>
                  <input
                    type="checkbox"
                    checked={patologias.includes('Nenhum')}
                    onChange={() => handleCheckboxChange('Nenhum', patologias, setPatologias)}
                  />
                  Nenhum
                </label>
                {PATOLOGIAS_OPCOES.map(pat => (
                  <label key={pat} className={`option-checkbox-label ${patologias.includes(pat) ? 'selected' : ''}`}>
                    <input
                      type="checkbox"
                      checked={patologias.includes(pat)}
                      disabled={patologias.includes('Nenhum')}
                      onChange={() => handleCheckboxChange(pat, patologias, setPatologias)}
                    />
                    {pat}
                  </label>
                ))}
              </div>
              <div className="additional-input-group">
                <label className="form-label" htmlFor="patologiaLivre">Outras Patologias (Adicionar livremente)</label>
                <input
                  type="text"
                  id="patologiaLivre"
                  className="form-input"
                  placeholder="Escreva outras patologias"
                  value={patologiasLivre}
                  disabled={patologias.includes('Nenhum')}
                  onChange={e => setPatologiasLivre(e.target.value)}
                />
              </div>
            </div>

            {/* Restrições Alimentares */}
            <div className="form-group">
              <label className="checkbox-group-title">Restrições Alimentares</label>
              <div className="options-grid">
                <label className={`option-checkbox-label ${restricoesAlimentares.includes('Nenhum') ? 'selected' : ''}`}>
                  <input
                    type="checkbox"
                    checked={restricoesAlimentares.includes('Nenhum')}
                    onChange={() => handleCheckboxChange('Nenhum', restricoesAlimentares, setRestricoesAlimentares)}
                  />
                  Nenhum
                </label>
                {RESTRICOES_OPCOES.map(res => (
                  <label key={res} className={`option-checkbox-label ${restricoesAlimentares.includes(res) ? 'selected' : ''}`}>
                    <input
                      type="checkbox"
                      checked={restricoesAlimentares.includes(res)}
                      disabled={restricoesAlimentares.includes('Nenhum')}
                      onChange={() => handleCheckboxChange(res, restricoesAlimentares, setRestricoesAlimentares)}
                    />
                    {res}
                  </label>
                ))}
              </div>
              <div className="additional-input-group">
                <label className="form-label" htmlFor="restricaoLivre">Outras Restrições (Adicionar livremente)</label>
                <input
                  type="text"
                  id="restricaoLivre"
                  className="form-input"
                  placeholder="Escreva outras restrições"
                  value={restricoesLivre}
                  disabled={restricoesAlimentares.includes('Nenhum')}
                  onChange={e => setRestricoesLivre(e.target.value)}
                />
              </div>
            </div>

            {/* Alergias Alimentares */}
            <div className="form-group">
              <label className="checkbox-group-title">Alergias Alimentares</label>
              <div className="options-grid">
                <label className={`option-checkbox-label ${alergias.includes('Nenhum') ? 'selected' : ''}`}>
                  <input
                    type="checkbox"
                    checked={alergias.includes('Nenhum')}
                    onChange={() => handleCheckboxChange('Nenhum', alergias, setAlergias)}
                  />
                  Nenhum
                </label>
                {ALERGIAS_OPCOES.map(ale => (
                  <label key={ale} className={`option-checkbox-label ${alergias.includes(ale) ? 'selected' : ''}`}>
                    <input
                      type="checkbox"
                      checked={alergias.includes(ale)}
                      disabled={alergias.includes('Nenhum')}
                      onChange={() => handleCheckboxChange(ale, alergias, setAlergias)}
                    />
                    {ale}
                  </label>
                ))}
              </div>
              <div className="additional-input-group">
                <label className="form-label" htmlFor="alergiasLivre">Outras Alergias (Adicionar livremente)</label>
                <input
                  type="text"
                  id="alergiasLivre"
                  className="form-input"
                  placeholder="Escreva outras alergias"
                  value={alergiasLivre}
                  disabled={alergias.includes('Nenhum')}
                  onChange={e => setAlergiasLivre(e.target.value)}
                />
              </div>
            </div>

            {/* Medicamentos e Suplementos */}
            <div className="form-group">
              <label className="form-label" htmlFor="medicamentos">Medicamentos Contínuos</label>
              <textarea
                id="medicamentos"
                className="textarea-field"
                placeholder="Ex: Paracetamol (caso necessário), Enalapril 10mg..."
                value={medicamentos}
                onChange={e => setMedicamentos(e.target.value)}
                style={{ minHeight: '80px' }}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="suplementos">Suplementos em Uso</label>
              <textarea
                id="suplementos"
                className="textarea-field"
                placeholder="Ex: Creatina 5g, Whey Protein..."
                value={suplementos}
                onChange={e => setSuplementos(e.target.value)}
                style={{ minHeight: '80px' }}
              />
            </div>
          </div>

          {/* ================= ABA 3: HÁBITOS ================= */}
          <div className={`tab-content ${activeTab === 'habitos' ? 'active' : ''}`}>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label" htmlFor="refeicoes">Refeições por Dia</label>
                <input
                  type="number"
                  id="refeicoes"
                  className="form-input"
                  placeholder="Ex: 5"
                  value={refeicoesPorDia}
                  onChange={e => setRefeicoesPorDia(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="agua">Consumo de Água por Dia (L)</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    id="agua"
                    className="form-input"
                    placeholder="Ex: 3"
                    value={litrosAgua}
                    onChange={e => setLitrosAgua(e.target.value)}
                    style={{ paddingRight: '60px' }}
                  />
                  <span style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontWeight: 600, fontSize: '0.9rem' }}>
                    litros
                  </span>
                </div>
              </div>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label" htmlFor="acorda">Horário que Acorda</label>
                <input
                  type="text"
                  id="acorda"
                  className="form-input"
                  placeholder="Ex: 6 ou 630"
                  value={horarioAcorda}
                  onChange={e => setHorarioAcorda(e.target.value)}
                  onBlur={e => handleTimeBlur(e.target.value, setHorarioAcorda)}
                />
                <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px', display: 'block' }}>
                  Digite os números (ex: 630 virará 06:30 ao sair do campo)
                </span>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="dorme">Horário que Dorme</label>
                <input
                  type="text"
                  id="dorme"
                  className="form-input"
                  placeholder="Ex: 23 ou 2230"
                  value={horarioDorme}
                  onChange={e => setHorarioDorme(e.target.value)}
                  onBlur={e => handleTimeBlur(e.target.value, setHorarioDorme)}
                />
                <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px', display: 'block' }}>
                  Digite os números (ex: 2230 virará 22:30 ao sair do campo)
                </span>
              </div>
            </div>

            {/* Atividade Física */}
            <div className="form-group">
              <label className="checkbox-group-title">Pratica atividade física?</label>
              <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                <label className={`option-checkbox-label ${praticaAtividade ? 'selected' : ''}`} style={{ flex: 1, justifyContent: 'center' }}>
                  <input
                    type="radio"
                    name="praticaAtividade"
                    checked={praticaAtividade === true}
                    onChange={() => setPraticaAtividade(true)}
                    style={{ accentColor: '#16a34a', width: '16px', height: '16px' }}
                  />
                  Sim
                </label>
                <label className={`option-checkbox-label ${!praticaAtividade ? 'selected' : ''}`} style={{ flex: 1, justifyContent: 'center' }}>
                  <input
                    type="radio"
                    name="praticaAtividade"
                    checked={praticaAtividade === false}
                    onChange={() => {
                      setPraticaAtividade(false);
                      setAtividadeDesc('');
                    }}
                    style={{ accentColor: '#16a34a', width: '16px', height: '16px' }}
                  />
                  Não
                </label>
              </div>

              {praticaAtividade && (
                <div className="additional-input-group" style={{ animation: 'fadeIn 0.2s ease' }}>
                  <label className="form-label" htmlFor="atividadeDesc">Qual atividade e frequência semanal?</label>
                  <input
                    type="text"
                    id="atividadeDesc"
                    className="form-input"
                    placeholder="Ex: Musculação, 4x por semana"
                    value={atividadeDesc}
                    onChange={e => setAtividadeDesc(e.target.value)}
                    required
                  />
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="observacoes">Observações Gerais</label>
              <textarea
                id="observacoes"
                className="textarea-field"
                placeholder="Outras anotações importantes..."
                value={observacoes}
                onChange={e => setObservacoes(e.target.value)}
                style={{ minHeight: '100px' }}
              />
            </div>
          </div>

          {/* Navegação Inferior */}
          <div className="form-navigation">
            {activeTab === 'pessoal' ? (
              <Link to={isEditMode ? `/pacientes/${id}` : '/pacientes'} className="btn-secondary">
                Cancelar
              </Link>
            ) : (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  if (activeTab === 'clinico') setActiveTab('pessoal');
                  else if (activeTab === 'habitos') setActiveTab('clinico');
                }}
              >
                Voltar
              </button>
            )}

            {activeTab !== 'habitos' ? (
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  if (activeTab === 'pessoal') setActiveTab('clinico');
                  else if (activeTab === 'clinico') setActiveTab('habitos');
                }}
              >
                Avançar
              </button>
            ) : (
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Salvando...' : isEditMode ? 'Salvar Alterações' : 'Salvar Paciente'}
              </button>
            )}
          </div>

        </form>
      </div>
    </div>
  );
}
