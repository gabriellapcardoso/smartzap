export type FlowMappingV1 = {
  version: 1
  contact?: {
    /** Nome do campo do Flow (response_json) que deve atualizar contacts.name */
    nameField?: string
    /** Nome do campo do Flow (response_json) que deve atualizar contacts.email */
    emailField?: string
  }
  /** custom_fields do contato: { chave_no_smartzap: nome_do_campo_no_flow } */
  customFields?: Record<string, string>
}

export type FlowTemplate = {
  key: string
  name: string
  description: string
  /** Flow JSON no formato exigido pela Meta (armazenado como JSONB). */
  flowJson: Record<string, unknown>
  /** Mapping padrão para salvar respostas no SmartZap. */
  defaultMapping: FlowMappingV1
}

// Observação importante:
// - Estes templates são “sem endpoint” (sem data_exchange) para validar rápido.
// - A Meta valida o Flow JSON no publish. Aqui guardamos um ponto de partida.

export const FLOW_TEMPLATES: FlowTemplate[] = [
  {
    key: 'lead_cadastro_v1',
    name: 'Lead / Cadastro (sem endpoint)',
    description: 'Coleta nome, e-mail e interesse. Ideal para capturar lead rápido.',
    flowJson: {
      version: '7.3',
      screens: [
        {
          id: 'CADASTRO',
          title: 'Cadastro',
          terminal: true,
          layout: {
            type: 'SingleColumnLayout',
            children: [
              {
                type: 'RichText',
                text: '**Vamos te cadastrar rapidinho**\n\nPreencha os dados abaixo:',
              },
              {
                type: 'TextEntry',
                name: 'lead_name',
                label: 'Nome',
                required: true,
              },
              {
                type: 'TextEntry',
                name: 'lead_email',
                label: 'E-mail',
                required: true,
              },
              {
                type: 'Dropdown',
                name: 'lead_interest',
                label: 'Qual seu interesse?',
                required: false,
                options: [
                  { id: 'produto', title: 'Produto' },
                  { id: 'servico', title: 'Serviço' },
                  { id: 'orcamento', title: 'Orçamento' },
                  { id: 'outro', title: 'Outro' },
                ],
              },
              {
                type: 'OptIn',
                name: 'lead_optin',
                text: 'Quero receber mensagens sobre novidades e promoções.',
              },
              {
                type: 'Footer',
                label: 'Enviar',
                'on-click-action': { name: 'complete' },
              },
            ],
          },
        },
      ],
    },
    defaultMapping: {
      version: 1,
      contact: {
        nameField: 'lead_name',
        emailField: 'lead_email',
      },
      customFields: {
        lead_interest: 'lead_interest',
        lead_optin: 'lead_optin',
      },
    },
  },
  {
    key: 'agendamento_v1',
    name: 'Agendamento (sem endpoint)',
    description: 'Coleta serviço, data e horário. Sem validação de agenda ainda.',
    flowJson: {
      version: '7.3',
      screens: [
        {
          id: 'AGENDAMENTO',
          title: 'Agendamento',
          terminal: true,
          layout: {
            type: 'SingleColumnLayout',
            children: [
              {
                type: 'BasicText',
                text: 'Escolha as opções abaixo para solicitar um agendamento.',
              },
              {
                type: 'Dropdown',
                name: 'service',
                label: 'Serviço',
                required: true,
                options: [
                  { id: 'consulta', title: 'Consulta' },
                  { id: 'visita', title: 'Visita' },
                  { id: 'suporte', title: 'Suporte' },
                ],
              },
              {
                type: 'DatePicker',
                name: 'date',
                label: 'Data',
                required: true,
              },
              {
                type: 'Dropdown',
                name: 'time',
                label: 'Horário',
                required: true,
                options: [
                  { id: '09:00', title: '09:00' },
                  { id: '10:00', title: '10:00' },
                  { id: '11:00', title: '11:00' },
                  { id: '14:00', title: '14:00' },
                  { id: '15:00', title: '15:00' },
                  { id: '16:00', title: '16:00' },
                ],
              },
              {
                type: 'TextEntry',
                name: 'notes',
                label: 'Observações (opcional)',
                required: false,
              },
              {
                type: 'Footer',
                label: 'Solicitar agendamento',
                'on-click-action': { name: 'complete' },
              },
            ],
          },
        },
      ],
    },
    defaultMapping: {
      version: 1,
      customFields: {
        appointment_service: 'service',
        appointment_date: 'date',
        appointment_time: 'time',
        appointment_notes: 'notes',
      },
    },
  },
  {
    key: 'pesquisa_nps_v1',
    name: 'Pesquisa / NPS (sem endpoint)',
    description: 'Coleta score NPS (0-10) e comentário opcional.',
    flowJson: {
      version: '7.3',
      screens: [
        {
          id: 'NPS',
          title: 'Pesquisa',
          terminal: true,
          layout: {
            type: 'SingleColumnLayout',
            children: [
              {
                type: 'BasicText',
                text: 'De 0 a 10, o quanto você recomendaria a gente para um amigo?',
              },
              {
                type: 'ChipsSelector',
                name: 'nps_score',
                label: 'Nota',
                required: true,
                options: [
                  { id: '0', title: '0' },
                  { id: '1', title: '1' },
                  { id: '2', title: '2' },
                  { id: '3', title: '3' },
                  { id: '4', title: '4' },
                  { id: '5', title: '5' },
                  { id: '6', title: '6' },
                  { id: '7', title: '7' },
                  { id: '8', title: '8' },
                  { id: '9', title: '9' },
                  { id: '10', title: '10' },
                ],
              },
              {
                type: 'TextEntry',
                name: 'nps_comment',
                label: 'Quer contar o motivo? (opcional)',
                required: false,
              },
              {
                type: 'Footer',
                label: 'Enviar pesquisa',
                'on-click-action': { name: 'complete' },
              },
            ],
          },
        },
      ],
    },
    defaultMapping: {
      version: 1,
      customFields: {
        nps_score: 'nps_score',
        nps_comment: 'nps_comment',
      },
    },
  },
]

export function getFlowTemplateByKey(key: string): FlowTemplate | null {
  const t = FLOW_TEMPLATES.find((x) => x.key === key)
  return t || null
}
