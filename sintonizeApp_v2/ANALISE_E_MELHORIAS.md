# Sintoniza · Modernização do app + análise técnica

Documento de entrega das melhorias de design, navegação, gráficos e da correção
do fluxo de cadastro de funcionário, com uma análise do que ainda falta para
deixar o app completo para a apresentação.

---

## 1. Como aplicar os arquivos

Os arquivos desta entrega seguem **exatamente a mesma estrutura de pastas** do seu
projeto (`sintonizeApp_v2/...`). Basta copiá-los por cima dos seus, mantendo seu
`node_modules` intacto. Nenhuma biblioteca nova precisa ser instalada — todos os
gráficos foram feitos em React Native puro de propósito, para não exigir rebuild
nem arriscar quebrar nada às vésperas da apresentação.

Passos:

1. Faça um backup (ou um commit) do estado atual.
2. Copie os arquivos da pasta `sintonizeApp_v2/` por cima dos existentes.
3. Reinicie o Metro: `npx expo start -c` (o `-c` limpa o cache).

O projeto foi validado com o TypeScript do próprio projeto (`tsc --noEmit`) **sem
nenhum erro** após as alterações.

---

## 2. Correção do bug do cadastro de funcionário

**Sintoma:** na área da empresa, ao clicar em *Cadastrar Funcionário* e depois em
*Voltar*, o app retornava para a tela inicial (escolha de cadastro), e ao concluir
o cadastro a empresa era jogada para o login.

**Causa:** a ação abria a tela `register-cli`, que tinha o botão *Voltar* fixo
apontando para `/(auth)/register` e, no sucesso, fazia `router.replace("/(auth)/login")`.
Essa tela é compartilhada com o cadastro público, então não sabia "de onde veio".

**Correção:** a tela agora reconhece a origem por parâmetro (`?origin=empresa`):

- O painel da empresa abre a tela com `register-cli?origin=empresa`.
- Quando vem da empresa, o *Voltar* retorna ao **painel da empresa** e, ao concluir,
  vai direto para a **lista de funcionários** (sem deslogar).
- O campo **ID da Empresa** é preenchido automaticamente (lido do login) e fica
  travado, evitando que a empresa digite o ID errado.
- O fluxo público (usuário se cadastrando sozinho) continua igual.

---

## 3. O que foi modernizado

### Design system
- `theme/colors.ts` — paleta refinada (tons de marca, neutros, estados e cores de
  saúde mental), mantendo as chaves antigas para compatibilidade.
- `theme/tokens.ts` (novo) — escala única de espaçamento, raio, tipografia e sombras
  (inclusive sombra colorida para botões).

### Componentes reutilizáveis
- `PrimaryButton` — variantes (primary, mint, outline, danger, ghost), tamanhos,
  estado de carregando, ícones e desabilitado.
- `TextField` — estado de foco, ícone à esquerda, botão de mostrar/ocultar senha,
  suporte a erro e campo desabilitado.
- `botao_voltar` (BackButton) — visual em "pílula" e `router.back()` seguro.
- `Card`, `ScreenHeader` (novos) — superfície e cabeçalho de tela padronizados.

### Navegação moderna
- `FloatingTabBar` (novo) — barra inferior flutuante estilo pílula, com destaque do
  item ativo (ícone + rótulo) e feedback tátil. Aplicada nas três áreas.
- A **área da empresa** ganhou navegação por abas própria, que antes não existia:
  **Início · Equipe · Relatórios · Perfil**.

### Gráficos e telas da empresa
- `components/charts/Charts.tsx` (novo) — barra empilhada, gráfico de barras
  verticais, linhas de progresso, KPI circular e legenda.
- `tela_inicial` da empresa — painel de saúde mental reformulado com KPI de
  bem-estar, distribuição em barras de progresso e barra empilhada com legenda.
- `relatorios.tsx` (novo) — tela de indicadores: cobertura, índice de bem-estar,
  distribuição das avaliações e saúde por departamento.
- `perfil.tsx` (novo) — perfil da empresa, **ID para vincular colaboradores**,
  dados cadastrais, exportação LGPD e logout.
- `listar-funcionario` — cabeçalho novo, botão de **novo funcionário**, estado vazio
  com chamada para ação e *pull-to-refresh*.

---

## 4. Análise de especialista — o que ainda falta

Itens organizados por prioridade pensando na apresentação.

### Prioridade ALTA (impacto direto na demonstração)
- **Configuração do servidor (`services/api.ts`):** o host está fixo em
  `192.168.0.71`. Antes de apresentar, confirme o IP da máquina que roda o Django
  na rede do local da apresentação — esse é o erro nº 1 em demos de app + API.
- **Estado de "carregando" e "vazio" em todas as telas:** padronizar como já foi
  feito na empresa (loading central + estado vazio com CTA) nas áreas de cliente e
  psicólogo, para nunca aparecer tela em branco no telão.
- **Espaçamento inferior das telas de cliente/psicólogo:** como a nova barra é
  flutuante, vale aumentar o `paddingBottom` do conteúdo dessas telas para ~110px
  (na empresa isso já foi ajustado), garantindo que o último item não fique atrás
  da barra.
- **Dados de demonstração (seed):** ter no banco uma empresa com ~8–12 funcionários
  já avaliados, distribuídos entre saudável/atenção/crítico, faz os gráficos
  brilharem. Painel vazio não vende a ideia.

### Prioridade MÉDIA (completude do produto)
- **Tratamento de erro de rede unificado:** hoje cada tela trata `fetch` à sua
  maneira (alguns com `Alert`, outros com `console.log`). Um helper central de API
  (com token automático e mensagens amigáveis) reduz bugs e repetição.
- **Logs de depuração:** há vários `console.log("TOKEN...", ...)` em produção
  (ex.: em `listar-funcionario` e `login`). Remover antes de apresentar — além de
  poluir, expõem token no console.
- **Confirmar/“desfazer” exclusão:** a exclusão de funcionário é lógica (ótimo),
  mas falta um filtro para *ver inativos* e uma ação de **reativar**.
- **Validação visual nos formulários:** o `TextField` agora suporta `error`;
  vale ligar essa prop às validações (hoje os erros saem só em `Alert`).
- **Acessibilidade:** rótulos de acessibilidade nos ícones-botão e contraste de
  texto secundário — rápido de fazer e impressiona banca.

### Prioridade BAIXA (evolução pós-apresentação)
- **Modo escuro:** já existe `constants/theme.ts` com light/dark; conectar ao
  design system novo deixaria o app com suporte real a tema.
- **Animações de entrada** (reanimated já está instalado) nos cards e na troca de
  abas dão um acabamento "premium".
- **Gráfico donut real:** se no futuro adotarem `react-native-svg` (suportado pelo
  Expo), dá para ter rosca/arco animado. Mantive em RN puro agora pela segurança.
- **Notificações** para alertas de funcionários em situação crítica.

---

## 5. Checklist rápido para o dia da apresentação

1. Backend Django rodando e acessível pelo IP configurado em `services/api.ts`.
2. `npx expo start -c` com o cache limpo.
3. Banco com dados de demonstração (empresa + funcionários avaliados).
4. Testar o fluxo principal: login empresa → painel → Relatórios → Equipe →
   *Novo funcionário* → Voltar (deve voltar ao painel) → concluir cadastro
   (deve cair na lista).
5. Conferir login como funcionário e como psicólogo (navegação nova nas três áreas).
6. Celular/emulador com bateria e em modo "não perturbe".

Bom trabalho — o projeto está com uma base sólida. As melhorias acima focam no que
mais aparece no telão e no que a banca costuma perguntar.
