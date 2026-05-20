interface AIPaciente {
  peso_inicial: number | null;
  altura: number | null;
  litros_agua: number | null;
  objetivos: string[] | null;
  objetivo_texto: string | null;
  patologias: string[] | null;
  restricoes_alimentares: string[] | null;
  alergias: string[] | null;
  refeicoes_por_dia: number | null;
  horario_acorda: string | null;
  horario_dorme: string | null;
  atividade_fisica: boolean | null;
  atividade_fisica_descricao: string | null;
}

interface AIConsulta {
  peso: number | null;
  percentual_gordura: number | null;
  data_consulta: string;
}

export interface AIInsights {
  metaAgua: number;
  aguaStatus: 'baixo' | 'ideal';
  recomNutri: string[];
  recomHabitos: string[];
  alertasSaude: string[];
  planoAcao: string[];
}

export function gerarInsightsPaciente(paciente: AIPaciente, consultas: AIConsulta[]): AIInsights {
  const metaAgua = paciente.peso_inicial 
    ? parseFloat(((paciente.peso_inicial * 35) / 1000).toFixed(1)) 
    : 2.5;

  const litrosConsumidos = paciente.litros_agua ? Number(paciente.litros_agua) : 0;
  const aguaStatus = litrosConsumidos >= metaAgua ? 'ideal' : 'baixo';

  const objectives = paciente.objetivos || [];
  const patologias = paciente.patologias || [];
  const restricoes = paciente.restricoes_alimentares || [];
  const alergias = paciente.alergias || [];

  const recomNutri: string[] = [];
  const recomHabitos: string[] = [];
  const alertasSaude: string[] = [];
  const planoAcao: string[] = [];

  // --- LÓGICA DE DIRETRIZES NUTRICIONAIS BASEADAS EM OBJETIVOS ---
  if (objectives.includes('Ganhar massa')) {
    recomNutri.push('Foque em um superávit calórico leve (250 a 500 kcal acima do seu gasto energético diário).');
    recomNutri.push('Mantenha o aporte proteico entre 1.6g e 2.2g por kg de peso corporal, distribuído ao longo do dia.');
    recomNutri.push('Priorize carboidratos complexos (batata doce, aveia, arroz integral) antes dos treinos para garantir energia.');
    planoAcao.push('Consumir uma fonte proteica (ovos, frango, whey, tofu) em todas as refeições principais.');
  } else if (objectives.includes('Emagrecer')) {
    recomNutri.push('Estabeleça um déficit calórico moderado e sustentável (cerca de 300 a 500 kcal de redução).');
    recomNutri.push('Aumente a ingestão de fibras (vegetais folhosos, chia, linhaça) para promover maior saciedade.');
    recomNutri.push('Monitore o uso de óleos no preparo de alimentos e evite calorias líquidas (sucos adoçados, refrigerantes).');
    planoAcao.push('Substituir lanches ultraprocessados por frutas frescas com fibras (como maçã com casca ou kiwi).');
  } else {
    recomNutri.push('Mantenha uma alimentação equilibrada baseada em comida de verdade, reduzindo ao máximo industrializados.');
    recomNutri.push('Garanta uma boa variedade de cores no prato para atingir a meta diária de micronutrientes.');
    planoAcao.push('Garantir que pelo menos metade do prato no almoço e jantar seja composto por vegetais e legumes.');
  }

  // --- LÓGICA DE ALERTAS E RESTRIÇÕES/ALERGIAS ---
  if (!alergias.includes('Nenhum') && alergias.length > 0) {
    alertasSaude.push(`ALERGIA ALIMENTAR CONFIRMADA: Exclusão total e rigorosa de: ${alergias.join(', ')}.`);
    alergias.forEach((alergia: string) => {
      if (alergia === 'Amendoim' || alergia === 'Soja' || alergia === 'Trigo') {
        alertasSaude.push(`Atenção redobrada na leitura de rótulos industriais buscando por "pode conter traços de ${alergia.toLowerCase()}".`);
      }
    });
  }

  if (!restricoes.includes('Nenhum') && restricoes.length > 0) {
    alertasSaude.push(`Restrição alimentar ativa para: ${restricoes.join(', ')}.`);
    if (restricoes.includes('Lactose')) {
      recomNutri.push('Substituir laticínios por versões "zero lactose" ou bebidas vegetais (amêndoas, coco, aveia) enriquecidas com cálcio.');
    }
    if (restricoes.includes('Glúten')) {
      recomNutri.push('Utilizar farinhas alternativas (arroz, grão-de-bico, amêndoas) e priorizar tubérculos como fontes de carboidrato.');
    }
  }

  if (!patologias.includes('Nenhum') && patologias.length > 0) {
    patologias.forEach((pat: string) => {
      if (pat === 'Diabetes') {
        alertasSaude.push('DIABETES: Evitar carboidratos simples de alto índice glicêmico isolados. Associar sempre a fibras, gorduras boas ou proteínas.');
        recomNutri.push('Fracionar as refeições ao longo do dia para evitar picos e quedas bruscas de glicemia.');
      }
      if (pat === 'Hipertensão') {
        alertasSaude.push('HIPERTENSÃO: Controlar rigorosamente a ingestão de sódio (máximo de 2g de sódio ou 5g de sal de cozinha por dia).');
        recomNutri.push('Utilizar temperos naturais (alho, cebola, orégano, limão) no preparo para reduzir a necessidade de sal.');
      }
      if (pat === 'Hipotireoidismo') {
        recomNutri.push('Garanta o aporte adequado de iodo, selênio (1 castanha-do-pará por dia) e zinco para apoiar a função da tireoide.');
      }
    });
  }

  // --- LÓGICA DE HÁBITOS E ESTILO DE VIDA ---
  if (aguaStatus === 'baixo') {
    recomHabitos.push(`Aumentar consumo de água. Sua meta ideal é de pelo menos ${metaAgua}L diários (atualmente consome ${litrosConsumidos}L).`);
    planoAcao.push(`Carregar uma garrafa de água de 1 litro e enchê-la pelo menos ${Math.ceil(metaAgua)} vezes ao dia.`);
  } else {
    recomHabitos.push(`Excelente! Consumo de água está adequado com a meta recomendada de ${metaAgua}L diários.`);
  }

  if (paciente.refeicoes_por_dia) {
    const refNum = Number(paciente.refeicoes_por_dia);
    if (refNum < 3) {
      recomHabitos.push('O número de refeições diárias é baixo. Considere fracionar mais para evitar episódios de fome intensa.');
    } else if (refNum > 6) {
      recomHabitos.push('O número de refeições é alto. Certifique-se de que os lanches sejam leves e de baixa densidade calórica.');
    }
  }

  // Sono
  if (paciente.horario_acorda && paciente.horario_dorme) {
    recomHabitos.push(`Rotina de sono registrada das ${paciente.horario_dorme} às ${paciente.horario_acorda}. Busque manter consistência nos horários.`);
  }

  // Atividade física
  if (paciente.atividade_fisica) {
    recomHabitos.push(`Treinos ativos: ${paciente.atividade_fisica_descricao || 'Sim'}. Garanta um descanso adequado entre os treinos.`);
  } else {
    recomHabitos.push('Atualmente sedentário. Inicie com caminhadas leves de 20 a 30 minutos, 3x por semana, para melhorar a saúde cardiovascular.');
    planoAcao.push('Realizar um agendamento na agenda semanal para 3 sessões de 20 minutos de atividade física leve.');
  }

  // Ajustes de histórico e peso das consultas recentes
  if (consultas && consultas.length > 1) {
    const consultasComPeso = consultas.filter(c => c.peso !== null);
    if (consultasComPeso.length > 1) {
      const pesoRecente = consultasComPeso[0].peso;
      const pesoAnterior = consultasComPeso[1].peso;
      if (pesoRecente !== null && pesoAnterior !== null) {
        const diff = pesoRecente - pesoAnterior;
        
        if (diff > 0.5) {
          if (objectives.includes('Emagrecer')) {
            alertasSaude.push(`Ganho recente de peso detectado (+${diff.toFixed(1)} kg). Avaliar retenção hídrica ou consistência na dieta.`);
          } else if (objectives.includes('Ganhar massa')) {
            recomNutri.push(`Evolução positiva de peso (+${diff.toFixed(1)} kg). Continue estimulando a síntese de massa muscular através de treino resistido.`);
          }
        } else if (diff < -0.5) {
          const perda = Math.abs(diff);
          if (objectives.includes('Emagrecer')) {
            recomNutri.push(`Excelente progresso! Redução de peso corporal de -${perda.toFixed(1)} kg desde a última consulta.`);
          } else if (objectives.includes('Ganhar massa')) {
            alertasSaude.push(`Queda de peso detectada (-${perda.toFixed(1)} kg). Avalie se o aporte calórico está sendo suficiente para hipertrofia.`);
          }
        }
      }
    }
  }

  return {
    metaAgua,
    aguaStatus,
    recomNutri: recomNutri.length > 0 ? recomNutri : ['Mantenha a alimentação equilibrada sugerida nas consultas.'],
    recomHabitos: recomHabitos.length > 0 ? recomHabitos : ['Mantenha sua rotina diária ativa e sono regulado.'],
    alertasSaude: alertasSaude.length > 0 ? alertasSaude : ['Nenhum alerta crítico de saúde detectado no momento.'],
    planoAcao: planoAcao.length > 0 ? planoAcao : ['Seguir as orientações de cardápio propostas pelo nutricionista.']
  };
}
