# HabitHub: decisões de produto (v1)

Resultado da entrevista de produto feita entre 09/10/2026 e 13/10/2026. Cada decisão vem com a justificativa em uma linha. Este documento é a base da especificação. Nada aqui é código de implementação.

## 1. Visão

- **O que é:** um tracker de hábitos na web em que cada hábito tem uma grade de quadradinhos, um por dia, no estilo do gráfico de contribuições do GitHub.
- **Para quem:** devs e pessoas de tecnologia, com a interface em português.
- **Objetivo do projeto:** portfólio pessoal que mostre trabalho full-stack com qualidade de produção. O cuidado extra de front-end fica concentrado na grade.
- **Por que existe ao lado dos concorrentes:**

| Concorrente | O que faz | O que o HabitHub faz diferente |
|---|---|---|
| HabitGrid | Web, sem conta, dados só no localStorage | Conta e sincronização entre aparelhos |
| CommitLife | iOS, voltado a devs | Web, funciona em qualquer aparelho |
| Habit Watcher | Desktop, open source | Web, sem instalação |
| Todos | Nenhum oferece grade pública | **Perfil público + imagem da grade para colar no README do GitHub** |

- **Critérios de sucesso (verificáveis):**
  1. O avaliador vê uma grade sem se cadastrar: a página inicial mostra uma grade de exemplo, e os dados reais do autor ficam em `/u/<autor>`, com link no README do repositório.
  2. A CI passa, com testes cobrindo as partes críticas listadas na seção 2.10.
  3. O README explica as decisões deste documento.

## 2. Decisões tomadas

### 2.1 Produto e escopo

| Decisão | Justificativa |
|---|---|
| Nome **HabitHub**, no endereço **`habithub-app.vercel.app`**, sem domínio próprio | Projeto de portfólio sem custo. `habithub.vercel.app` pertence a outra conta (o 404 da verificação inicial vinha de um projeto sem deploy, não de um nome livre). É o endereço permanente das imagens nos READMEs. |
| A v1 inclui: o painel "Hoje" (hábitos do dia e tarefas avulsas); cadastro, login, recuperação de senha e exclusão de conta; criar, editar, arquivar e excluir hábitos; registrar hoje e dias passados; uma grade por hábito e um painel; sequência atual, maior sequência e taxa de conclusão; perfil público e imagem para README; exportação em JSON; página de privacidade | Cobre o produto de ponta a ponta, sem itens que não mostram nada novo. |
| Diferencial: perfil público + imagem SVG da grade para o README, com os tons de intensidade como apoio | Nenhum concorrente faz isso. O avaliador vê funcionando no README do autor. Mostra geração de imagem no servidor, cache e controle de privacidade. |
| Interface em português. Todos os textos ficam num arquivo de mensagens, com a biblioteca de tradução configurada só para pt-BR. Datas formatadas com `Intl` | Traduzir no futuro vira adicionar um arquivo, sem mexer nos componentes. |
| Código, identificadores e commits em inglês. README em português | Inglês é o padrão de mercado no código. O README acompanha o idioma do produto. |
| Página inicial (sem login): uma tela com título, uma frase, uma grade **marcada como "Exemplo"** (dados fixos, desenhada pelo mesmo cálculo da grade), os botões "Criar conta" e "Entrar", e um rodapé com links para o repositório e a privacidade. Quem está logado vai direto ao painel | O avaliador vê a grade sem clicar em nada, sem expor os hábitos de ninguém e sem depender do banco. |
| Os dados reais aparecem no perfil público do autor, com link no README do repositório. Não há link para esse perfil na página inicial | Mostra dados reais sem construir uma demonstração separada. |
| Sem demonstração interativa sem cadastro (nem conta demo, nem ambiente temporário) | Custaria mais do que entrega, e o cadastro já é rápido. |
| Colocar no ar cedo uma versão mínima (cadastro, hábitos, marcar, grade) e o autor usar todo dia a partir daí | Como não dá para registrar dias anteriores à criação do hábito, essa é a única forma de a vitrine ter histórico no lançamento. Também obriga a usar migrações desde o início, sem nunca recriar o banco. |

### 2.2 Modelo de hábito

| Decisão | Justificativa |
|---|---|
| Toda meta é numérica: um inteiro de 1 a 99.999 (padrão 1), com unidade opcional. Cada dia guarda um inteiro de 0 a 99.999. Não há decimais | Um único modelo cobre "feito ou não feito" (meta 1) e quantidades ("Ler 20 páginas", "10.000 passos"). Quem precisaria de decimais usa uma unidade menor ("450 min" em vez de "7,5 h"). |
| Campos: nome (até 40 caracteres), cor (paleta de 8), meta, unidade (até 15 caracteres), dias da semana, público ou privado (privado por padrão). Sem descrição nem emoji | O mínimo necessário para o produto funcionar. |
| Frequência: todos os dias ou dias fixos da semana | Atende "academia seg/qua/sex" sem quebrar a lógica de um quadradinho por dia. |
| Meta e agenda são guardadas em **versões com a data em que passaram a valer**. Cada dia é avaliado pela versão que valia naquele dia. Uma mudança vale a partir de hoje, e várias mudanças no mesmo dia substituem a versão de hoje. Nome e cor não têm versões | Mudar um objetivo não reescreve o histórico. |
| A data de início é a data de criação, no fuso do perfil. Os dias anteriores aparecem apagados, não aceitam clique e ficam fora das estatísticas | Simples, e não há histórico inventado. |
| Arquivar esconde o hábito do painel e o torna privado: ele sai do perfil público, a imagem passa a mostrar "indisponível", e desarquivar não o publica de novo. Os dias arquivados contam como dias vazios: entram como não cumpridos na taxa e quebram a sequência. Isso é só uma marcação no hábito, sem versão | Arquivar não serve para proteger a sequência, e a grade nunca contradiz os números. |
| Excluir apaga o hábito, os registros e as versões | Exclusão definitiva e simples. |
| No máximo 20 hábitos ativos por conta (os arquivados não contam) | Protege a tela e a cota do banco grátis. |
| Os hábitos aparecem no painel na ordem de criação, sem reordenação | Nenhum campo nem tela extra na v1. |
| O banco aceita um único registro por hábito por dia | É a base do modelo, então a garantia fica no banco. |

### 2.3 Tempo e estados do dia

| Decisão | Justificativa |
|---|---|
| O fuso fica salvo no perfil: é detectado pelo navegador no cadastro e pode ser editado. Todo "hoje" é calculado por ele, inclusive no servidor e na imagem. O app avisa quando o navegador está em outro fuso | O servidor precisa saber qual é o "hoje" do usuário para validar registros e gerar a imagem. |
| Os registros são guardados como data de calendário (`DATE`), sem hora | Mudar de fuso não desloca o histórico. |
| O dia vira à meia-noite do fuso do perfil | Quem fez algo depois da meia-noite marca o dia anterior. Uma virada configurável complicaria todo cálculo de datas. |
| Qualquer dia desde o início do hábito pode ser editado. Dias futuros são bloqueados pelo servidor | Esquecer de marcar é o caso mais comum, e a grade é pessoal. |
| Existe a opção "Pular dia", sem limite, no menu do dia, com um **motivo opcional** de até 200 caracteres que pode ser editado depois. Os dias pulados e seus motivos aparecem numa lista "Dias pulados" na página do hábito. Desfazer o pulo, ou registrar um valor no dia, apaga o motivo | Um dia de doença não deve zerar uma sequência longa, e o motivo deixa um histórico de por que o dia foi pulado. |
| O período, os limites dos tons e o início da semana são parâmetros da função que calcula a grade, não valores fixos no código | Trocar o período ou o dia de início da semana no futuro vira mudar um argumento. |

**Estados de um dia:**

| Situação | Na grade | Sequência | Taxa de conclusão |
|---|---|---|---|
| Agendado, meta cumprida | tom 4 | +1 | conta como cumprido |
| Agendado, parcial (0 < valor < meta) | tons 1 a 3 | quebra | conta como não cumprido |
| Agendado, vazio, já passou | cinza (sem vermelho) | quebra | conta como não cumprido |
| Hoje, ainda vazio | cinza com contorno | ainda não quebra | fica de fora |
| Hoje, cumprido | tom 4 | +1 | conta como cumprido |
| Fora da agenda, vazio | neutro (hachurado) | ignorado | fica de fora |
| Fora da agenda, com registro ("dia extra") | tom correspondente ao valor | não soma nem quebra | fica de fora |
| Pulado | neutro (hachurado) | não soma nem quebra | fica de fora |
| Arquivado | cinza (igual a um dia vazio) | quebra | conta como não cumprido |
| Antes do início do hábito | apagado, sem clique | não se aplica | fica de fora |

**Tons:** 0 = sem registro; 1 = até 1/3 da meta; 2 = até 2/3; 3 = abaixo de 100%; 4 = 100% ou mais. Com meta 1, só existem os tons 0 e 4.

### 2.4 Estatísticas

| Decisão | Justificativa |
|---|---|
| Sequência atual: número de dias agendados cumpridos em seguida. O dia de hoje vazio ainda não quebra | Segue a tabela de estados. |
| Maior sequência: calculada sobre todo o histórico | É um recorde, então não depende do período exibido. |
| Taxa de conclusão: últimos 12 meses, dividindo os dias cumpridos pelos dias agendados que já terminaram (sem contar os pulados). Hoje só entra se já tiver sido cumprido | O número bate com a grade exibida e não cai pela manhã só porque o dia ainda não acabou. |
| O cartão mostra a sequência atual. A página do hábito mostra os três números | Painel enxuto, com os detalhes na página do hábito. |

### 2.4.1 Hoje: hábitos e tarefas do dia

Acrescentado depois das primeiras semanas de uso. Tarefas avulsas são um recurso à parte: não entram nas sequências, na grade, nas estatísticas nem no perfil público.

| Decisão | Justificativa |
|---|---|
| Bloco "Hoje" no topo do painel, com dois painéis lado a lado no desktop e empilhados no celular: "Hábitos de hoje" e "Tarefas do dia" | A grade continua sendo o elemento central, logo abaixo. |
| "Hábitos de hoje" lista só os hábitos agendados para hoje, em ordem de criação fixa (um treino extra num dia de folga é registrado pelo menu do quadradinho). Cada hábito tem uma caixa de marcar quadrada na cor dele, e **um clique completa a meta inteira**. Meta maior que 1 também mostra o progresso ("2 de 8 copos") e os botões −1 e +1. Desmarcar zera o dia, e quando isso apaga uma quantidade, um aviso oferece "Desfazer". Os feitos ficam riscados, e um dia pulado aparece como "pulado" | Marcar o dia sem rolar até o cartão e sem clicar 20 vezes. O −1 e o "Desfazer" corrigem cliques errados. A ordem fixa evita que os itens mudem de lugar enquanto a pessoa marca. |
| O estado otimista dos hábitos é compartilhado entre o "Hoje" e os cartões | Marcar no "Hoje" atualiza na hora a grade e o placar do cartão. |
| Uma tarefa tem só o título (até 120 caracteres) e é criada para hoje, num campo em que o Enter salva. As caixas das tarefas são redondas | É o caso de uso descrito: coisas únicas daquele dia. O formato redondo diferencia tarefas de hábitos. |
| Uma tarefa não concluída continua aparecendo nos dias seguintes até ser marcada como feita, com a indicação "desde seg., 12/10". O cálculo usa a data de criação e o fuso do perfil, sem nenhuma rotina agendada | Nada se perde quando o dia vira, e não há rotina para manter. |
| Uma tarefa concluída fica riscada até o fim do dia e depois some da tela. Ela fica guardada no banco, para a exportação do M4. Tarefas podem ser excluídas | O dia termina limpo, sem perder o histórico. |
| No máximo 50 tarefas pendentes. Tarefas são sempre privadas. Ordem: as mais antigas primeiro | O limite protege a tela e o banco grátis. As mais antigas no topo chamam atenção para o que está atrasado. |

### 2.5 Perfil público e imagem do README

| Decisão | Justificativa |
|---|---|
| A privacidade é definida por hábito, e todo hábito é privado por padrão | Ninguém publica algo sem querer. |
| No máximo **2 hábitos públicos** por conta. Arquivar libera a vaga | O perfil mostra só o que a pessoa escolheu destacar, e cada imagem pública acorda o banco no máximo uma vez por hora. |
| O motivo de um dia pulado nunca aparece no perfil público nem na imagem do README, nem quando o hábito é público. O dia aparece só como "pulado" | Motivos como "estava doente" são informação sensível. |
| O nome de usuário é escolhido na própria página do hábito, na primeira vez que você publica algo, e pode ser trocado nas configurações. Publicar exige e-mail confirmado **quando o cadastro estiver aberto a todos**. Enquanto ele é restrito à lista de e-mails (até o M4), a lista basta, e a exigência passa a valer sozinha quando `SIGNUP_ALLOWLIST` vira `*` | O cadastro fica curto, e ninguém cria perfis públicos com e-mails falsos. Com o cadastro fechado não existem contas descartáveis, e o envio de e-mails só chega no M4. |
| Formato do nome de usuário: de 3 a 20 caracteres, só `[a-z0-9-]`, sem hífen no começo ou no fim, único sem diferenciar maiúsculas de minúsculas. Uma lista curta de nomes é bloqueada (`admin`, `suporte`, `habithub`…) | Todo perfil fica em `/u/`, então não colide com rotas do app. A lista só evita alguém se passar pelo app. |
| Trocar o nome de usuário libera o nome antigo na hora, e os links antigos do perfil quebram. Excluir a conta também libera os nomes | É o mais simples. As imagens do README não são afetadas, porque usam o código do hábito. |
| `/u/<nome>` mostra só o nome de usuário e os cartões dos hábitos públicos, na mesma tela do dono, sem edição. Responde "não encontrado" se não houver nenhum hábito público | Não exige nenhum componente novo e não revela que a conta existe. |
| O perfil público não aparece em buscadores (`noindex`), e a prévia ao compartilhar o link usa uma imagem fixa do site | Ninguém espera ver os próprios hábitos no Google. A prévia com a grade fica para a v2. |
| Endereço da imagem: `/api/embed/<id>.svg`, com um código curto, aleatório e imutável para cada hábito | A imagem continua funcionando mesmo que o hábito ou o nome de usuário mudem, e o endereço não revela quantos hábitos existem. |
| A imagem mostra o nome do hábito, a grade de 12 meses e a sequência atual, em português, usando a fonte do sistema | Imagens no README não carregam fontes externas. |
| Tema escolhido por `?theme=dark` ou `?theme=light`. A página do hábito mostra uma prévia da imagem e um botão "Copiar código para o README" que gera um `<picture>` com as duas versões. A imagem se atualiza sozinha: não é preciso colar o código de novo | No GitHub, a tag `<picture>` escolhe sozinha a versão clara ou escura conforme o tema de quem lê. |
| Cache de 1 hora na Vercel e no proxy de imagens do GitHub. Quando expira, a versão anterior continua sendo mostrada enquanto o servidor gera a nova | Poupa a cota do Neon: no máximo uma geração por hora para cada imagem e tema. |
| Hábito privado, arquivado, excluído, de conta excluída ou inexistente: todos mostram a mesma imagem "Hábito indisponível", com cache de 5 minutos | Não revela se o hábito existe, e o README não fica com uma imagem quebrada. |

### 2.6 Contas e autenticação

| Decisão | Justificativa |
|---|---|
| O cadastro é feito **só com e-mail e senha** | Toda conta tem uma forma de entrar que não depende de terceiros. |
| O GitHub pode ser vinculado nas configurações, já logado, mesmo que o e-mail do GitHub seja outro. Depois de vinculado, "Entrar com GitHub" funciona. Criar conta pelo GitHub e unir contas automaticamente ficam desligados. Um GitHub sem conta vinculada recebe a mensagem "Nenhuma conta vinculada a este GitHub". Sempre dá para desvincular | Elimina por completo o ataque de sequestro de conta por união automática, e devs costumam usar outro e-mail no GitHub. |
| Verificação de e-mail sem bloquear o uso: a pessoa usa o app na hora e vê um aviso fixo. A confirmação só é exigida para publicar algo e para vincular o GitHub | O cadastro continua rápido, e o e-mail é confirmado antes de qualquer coisa ficar pública. |
| Recuperação de senha por um link enviado por e-mail, que funciona uma vez e vale por 1 hora. A tela responde a mesma coisa exista ou não uma conta com aquele e-mail. São no máximo 3 pedidos por hora para cada e-mail, mais um limite por IP. Trocar a senha encerra as outras sessões | Segue as boas práticas e protege a cota de e-mails do Gmail. |
| Até o M4, o cadastro em produção fica fechado: só os e-mails listados em `SIGNUP_ALLOWLIST` criam conta (`*` libera para todos). Sem a variável, produção fica fechada por padrão | O site vai ao ar antes de existirem recuperação de senha e página de privacidade. Ninguém de fora cria uma conta que não conseguiria recuperar. |
| A sessão dura 30 dias e se renova a cada uso | Quem abre o app todo dia nunca precisa entrar de novo. |
| Trocar a senha exige a senha atual e encerra as outras sessões. Trocar o e-mail só acontece depois do clique num link enviado ao novo endereço | Segue as boas práticas. |
| Exclusão de conta imediata e definitiva, depois de a pessoa digitar o próprio e-mail para confirmar. A janela de confirmação oferece exportar os dados antes. Tudo é apagado de uma vez, as sessões são encerradas e as imagens passam a mostrar "indisponível" | Simples e definitiva, sem rotina agendada. |
| Os limites de tentativas do Better Auth guardam as contagens **no banco**: valores padrão para login e cadastro, e o limite específico para a recuperação de senha. Sem captcha | Na Vercel, contagens guardadas na memória não são compartilhadas entre as instâncias, então o limite não funcionaria. |

### 2.7 Dados e privacidade

| Decisão | Justificativa |
|---|---|
| O servidor guarda a versão oficial dos dados, no Postgres. A interface atualiza na hora do clique e volta ao estado anterior, com uma mensagem, se o salvamento falhar. Sem funcionamento offline | Sincronizar dados offline e resolver conflitos daria um projeto inteiro. O nicho "funciona sem servidor" já é do HabitGrid. |
| Exportação em JSON, gerada na hora, com `formatVersion: 1`. Inclui a conta (e-mail, nome de usuário, fuso, data de criação, se o GitHub está vinculado), os hábitos (inclusive arquivados), as versões e os registros. Não inclui o hash da senha, as sessões, os códigos de verificação e recuperação, nem os dados internos do vínculo com o GitHub | Atende o direito de portabilidade da LGPD. O campo de versão permite uma futura importação. |
| Banco Neon em `aws-sa-east-1` e funções da Vercel em `gru1`, ambos em São Paulo | Menor latência para usuários no Brasil e dados no país. A região do Neon não pode ser mudada depois, por isso é decidida antes do primeiro deploy. |
| Página de privacidade em português na v1, sem termos de uso | A LGPD se aplica, porque o app guarda dados de outras pessoas. |
| Antes de cada migração, uma cópia de backup do banco é criada no Neon, e só as 3 mais recentes são mantidas | É a única proteção real dos dados (o Neon grátis só restaura algumas horas para trás). Também limita por quanto tempo os dados de contas excluídas ficam nos backups. |

**Modelo de dados (conceitual):**
- **Usuário**: as tabelas do Better Auth (usuário, sessão, conta vinculada, verificação, limite de tentativas), mais o fuso (nome IANA) e o nome de usuário (opcional e único).
- **Hábito**: id interno, código público da imagem, dono, nome, cor, unidade, público, data de arquivamento, data de início e data de criação.
- **Versão da configuração**: hábito, data em que passa a valer, meta e dias da semana. Única por (hábito, data).
- **Registro do dia**: hábito, data, valor, pulado e motivo do pulo (opcional, só em dias pulados). Único por (hábito, data). Um dia sem registro é um dia vazio.
- **Tarefa**: dono, título, dia para o qual foi criada e dia em que foi concluída (vazio enquanto pendente).

### 2.8 Interface

| Decisão | Justificativa |
|---|---|
| A grade mostra os últimos 12 meses até hoje (53 colunas), com a semana começando no domingo | É igual ao perfil do GitHub e ao calendário brasileiro. Dá para mudar depois por parâmetro. |
| Tela principal: o bloco "Hoje" no topo (seção 2.4.1) e, abaixo, um cartão por hábito com o placar, o nome e a grade. O registro do dia sai dos cartões e fica só no "Hoje" e no menu de cada dia. A página do hábito tem as estatísticas, as configurações, o controle de hoje, a grade completa e o botão de código para o README | "O que fazer hoje" em cima e "como estou indo" embaixo, sem o mesmo botão em dois lugares. |
| Botão de hoje: com meta 1, um toque alterna. Com meta maior que 1, há botões − e + e o número pode ser digitado | O registro do dia leva um toque. |
| Clicar num quadradinho abre um menu com a data por extenso, o valor (alternar ou digitar) e "Pular dia" / "Desfazer pulo" | Evita marcações por engano em quadradinhos de 11 px e deixa o "pular" fácil de achar. |
| No celular, a tela principal mostra só as semanas mais recentes que cabem na largura (alinhadas à direita, com a sobra da esquerda cortada só com CSS). A página do hábito tem a grade completa com rolagem lateral | Sem rolagem dentro de rolagem, e com o mesmo HTML gerado no servidor para todas as telas. |
| Cada hábito escolhe uma de 8 cores com nome (Menta, Oceano, Uva, Chiclete, Tomate, Tangerina, Girassol, Lagoa), Menta por padrão. Os 4 tons da grade são derivados da cor do hábito, misturada com o cinza do quadradinho vazio, e calculados em TypeScript para o app e a imagem do README | Os cartões ficam fáceis de distinguir, e os nomes deixam a escolha mais divertida. Um teste garante que o número sobre cada cor tenha contraste de pelo menos 4,5:1 nos dois temas. |
| Tema claro e escuro, com **escuro como padrão**, e um botão sol/lua para trocar. A opção de seguir o sistema foi removida | Escolha do autor depois de usar o app. A imagem do README continua com as duas versões. |
| Painel vazio: botão "Criar primeiro hábito" e 3 sugestões (Ler 10 páginas, Beber 8 copos de água, Exercício seg/qua/sex) que preenchem o formulário | Mostra logo na primeira tela que existem meta numérica e dias da semana. |
| Tom dos textos: "você", informal e sem culpa. O app nunca diz "falhou": um dia vazio é "não registrado" | Combina com a grade sem vermelho. |
| Acessibilidade no nível WCAG 2.2 AA: cada quadradinho tem uma descrição para leitores de tela; o foco do teclado fica visível; cada grade é uma única parada da tecla Tab, com as setas andando entre os dias e o Enter abrindo o menu; a cor nunca é a única informação (hachura nos dias neutros, contorno no dia de hoje) | A grade é a peça central do capricho de front-end. |
| Animação: preenchimento do quadradinho (cerca de 150 ms) e transições dos menus. Ao registrar um dia, o quadradinho dá um "pulo" e o número da sequência sobe. Nada anima ao carregar a página, e tudo é desligado para quem ativou "reduzir movimento". Sem confete | É o retorno sutil escolhido: responde à ação da pessoa sem distrair. |

### 2.8.1 Direção visual

Definida a partir de: "calmo e divertido", inspirado no GitHub mas com identidade própria, referências Spotify, Uber e Linear, nada com cara de SaaS genérico, tipografia técnica e geométrica, tema claro como versão oficial (depois trocado: o escuro virou o padrão, inclusive nas capturas do portfólio e do README no M5), ousadia na cor e no placar, cartões arejados e retorno sutil.

| Decisão | Justificativa |
|---|---|
| Fundo "névoa" `#F1F3F2`, superfícies brancas `#FFFFFF`, tinta preta `#000000`, texto secundário `#5B616B`. No escuro: `#0F1113`, `#181B1E` e `#F4F6F5`. Quadradinho vazio `#D3D9D7` no claro e `#383E44` no escuro (contraste de cerca de 1,45:1 e 1,6:1 com o cartão) | A cor fica nos hábitos, não na moldura. O preto e o branco firmes vêm da referência do Uber. Os vazios precisam ser visíveis, porque um dia vazio também é informação. |
| Figtree para o texto e Unbounded (geométrica larga) só para números, títulos e a marca, as duas variáveis e servidas pelos pacotes Fontsource (sem buscar no Google durante o build) | Técnica e geométrica, como pedido. A Unbounded dá personalidade aos números sem pesar no texto corrido. Buscar no Google quebrava o build na CI. |
| O elemento memorável é o **placar**: um bloco sólido na cor do hábito com a sequência em número grande, no cartão e, maior, na página do hábito | Junta as duas escolhas (cor e placar) num único gesto, inspirado nas capas do Spotify. Todo o resto fica discreto. |
| Cartões sem borda nem sombra, com cantos bem arredondados. Botões em pílula. Quadradinhos com cantos de 3 px | Foge do "kit SaaS" (cartões iguais com sombra cinza). Cada forma tem um raio próprio, conforme a hierarquia. |
| "Feito hoje" e a quantidade que atingiu a meta assumem a cor do hábito | O momento de cumprir fica visível sem precisar de comemoração. |
| Cada hábito tem a sua legenda, nos tons da própria cor. "Fora da agenda" e "pulado" só aparecem quando o hábito tem esses dias | A legenda explica a cor que a pessoa está vendo, sem repetir itens que não se aplicam. |
| Marca: "habithub" em minúsculas na Unbounded, com 4 quadradinhos coloridos | É a grade reduzida a um símbolo. |

### 2.9 Stack e arquitetura

| Decisão | Justificativa |
|---|---|
| Um projeto **Next.js (App Router)** com front-end e back-end juntos: Server Components para leitura, Server Actions para alterações e Route Handlers para a imagem, a exportação e a autenticação. Roda em Node | Um deploy só. Uma API separada em outro subdomínio `vercel.app` não compartilharia o cookie de sessão, porque o `vercel.app` está na Public Suffix List. |
| A lógica de domínio (datas, estados do dia, sequências, versões, cálculo da grade) fica em módulos TypeScript puros, sem depender do Next | A parte difícil fica testável com testes unitários rápidos. |
| A grade é calculada por uma única função pura e desenhada por dois componentes: HTML no app e SVG na imagem | A imagem do README e o app nunca discordam. |
| **Postgres 17 no Neon** (plano grátis) com **Prisma** | Postgres tem `DATE` e permite garantir um registro por dia no próprio banco. O Neon cria cópias instantâneas do banco e não pausa por falta de uso. Prisma foi escolha do autor. |
| Datas: coluna `DATE` e um único módulo de conversão. Em todo o resto do código, um dia é um `CalendarDate` no formato `'YYYY-MM-DD'`, convertido só com funções UTC | O Prisma devolve `DATE` como um `Date` à meia-noite UTC, o que desloca o dia no Brasil. |
| **Better Auth ≥ 1.6.11** | Já traz e-mail e senha, verificação, recuperação, OAuth e limite de tentativas. As versões anteriores têm a CVE-2026-53516, de sequestro de conta pela união automática. |
| E-mail enviado por um Gmail criado só para o app, via SMTP com senha de app (Nodemailer), atrás de uma interface `EmailSender`. Em desenvolvimento e nos testes, uma versão falsa mostra os links no terminal | É grátis e funciona sem domínio próprio. Trocar pelo Resend no futuro é mexer em um arquivo. |
| **Tailwind CSS + shadcn/ui** | Componentes acessíveis prontos sem uma cara genérica, com o esforço visual concentrado na grade. |
| **Sentry** no plano grátis, para erros do servidor e do navegador. Sem estatísticas de uso | No plano grátis, a Vercel guarda os logs por cerca de 1 hora. |
| Sentry com dados na região da União Europeia, só erros (sem métricas de desempenho nem gravação de sessão) e com a coleta de dados restrita: sem cookies, corpos de requisição, parâmetros de banco nem variáveis locais. Dos cabeçalhos, só o user-agent. O usuário é identificado apenas pelo id interno | A versão 11 do SDK coleta tudo isso por padrão. A UE tem a GDPR, mais próxima da LGPD. |
| Hospedagem na **Vercel**, no plano grátis (Hobby) | Combina com o Next.js, não tem custo e serve para uso não comercial. |

### 2.10 Qualidade, CI e deploy

| Decisão | Justificativa |
|---|---|
| Testes unitários (Vitest) para datas, estados, sequências, versões e o cálculo da grade, rodando em `America/Sao_Paulo` e `Asia/Tokyo` | Encontra deslocamentos de fuso, que são o tipo de erro mais provável. |
| Testes de integração com um Postgres de verdade em contêiner no GitHub Actions: o usuário A não lê nem altera dados do usuário B; o banco aceita um registro por dia; um hábito privado não aparece no perfil público nem na imagem; um GitHub não vinculado não consegue entrar nem criar conta | Cobre as regras de segurança e de integridade. |
| Testes ponta a ponta (Playwright) em 4 fluxos: cadastro → hábito → marcar → grade; recuperação de senha com o e-mail falso; publicar → perfil público; a imagem retorna um SVG. Mais a verificação de acessibilidade com axe | Cobre o produto de ponta a ponta. |
| A CI roda a cada pull request: lint, checagem de tipos e as três camadas de teste. Sem meta de porcentagem de cobertura | O que vale é cobrir as partes críticas, e o avaliador confere isso pela pasta de testes. |
| Cada pull request ganha uma versão de teste do site na Vercel, usando o banco de produção (ver seção 2.9) | Basta para conferir telas e fluxos sem custo de configuração extra. |
| As migrações rodam no build de produção: o script só age quando `VERCEL_ENV=production`, cria o backup e depois roda `prisma migrate deploy`. Sem as credenciais do Neon, o build falha. As migrações usam a conexão direta (`DATABASE_URL_UNPOOLED`), e o app usa a conexão com pooling. As migrações precisam ser compatíveis com a versão anterior do código (adicionar primeiro, remover depois) | Durante o deploy, o código antigo roda com o banco novo, e o processo não depende de memória humana. |
| As previews usam **o mesmo banco da produção** e **nunca** rodam migrações (`MIGRATE_PREVIEW_DATABASE` fica desligado). Risco aceito: o que for testado numa preview grava nos dados reais, e um PR com migração só é verificado depois do merge (com backup) | Projeto de portfólio com um único usuário, sem plano de virar produto. As previews ficam protegidas pelo login da Vercel. |

### 2.11 Repositório e ambiente local

| Decisão | Justificativa |
|---|---|
| Repositório público com licença MIT | É o padrão em portfólio. |
| Toda mudança passa por um pull request, a `main` só aceita mudanças com a CI verde, e os commits seguem o padrão Conventional Commits | O processo de trabalho fica visível para o avaliador. |
| **npm** e Node 24 LTS | É ferramenta que o autor já conhece, e o pnpm não traria ganho relevante para um app único. |
| Postgres 17 em Docker Compose (porta 5434, a mesma versão da CI e do Neon), um `.env.example` com todas as variáveis, e um script de dados de teste **só para o banco local** (`npm run db:seed`) | Quem clonar o repositório roda o projeto com `docker compose up` + `npm run dev`. |
| Servidor de desenvolvimento na porta 3100 | A porta 3000 já é usada por outro projeto na máquina do autor. |
| Prettier (largura 120) com verificação na CI | Formatação consistente sem discussão. |

## 3. Fora do escopo da v1

- Lembretes e notificações (e-mail ou push)
- Funcionamento offline e PWA
- App nativo
- Hábitos negativos ("não fumar")
- Frequência "X vezes por semana"
- Recursos sociais (seguir pessoas, cobrança mútua)
- Integração com o GitHub para marcar hábitos a partir de commits
- Importar dados de outros apps
- Versão em inglês (a estrutura de tradução fica pronta, mas sem o texto em inglês)
- Anotações por dia (a única exceção é o motivo opcional de um dia pulado)
- Tarefas com data futura, edição do título de uma tarefa, descrição em tarefas e uma tela de histórico de tarefas
- Grade combinada de todos os hábitos
- Seletor para ver anos anteriores
- Prévia de link com a grade (Open Graph dinâmico)
- Foto e biografia no perfil público
- Reordenar hábitos
- Descrição e emoji nos hábitos
- Registrar dias anteriores à criação do hábito
- Criar conta pelo GitHub e unir contas automaticamente
- Demonstração interativa sem cadastro (conta demo ou ambiente temporário)
- Prazo para desistir da exclusão de conta
- Redirecionar nomes de usuário antigos para o novo
- Captcha
- Termos de uso
- Estatísticas de uso do produto
- Comemoração de marcos (confete, conquistas)
- Domínio próprio

## 4. Decisões adiadas

Nenhuma decisão ficou em aberto. As duas abaixo foram tomadas "por enquanto" e têm um gatilho para serem revistas:

| Decisão | Situação atual | O que precisa acontecer para decidir |
|---|---|---|
| Versão em inglês | Só pt-BR, com a estrutura de tradução pronta | Decidir quando o autor for se candidatar a vagas fora do Brasil. O custo é escrever o `en.json`, um seletor de idioma e um parâmetro de idioma na imagem do README. |
| Domínio próprio | Só `habithub-app.vercel.app` | Rever se os e-mails do Gmail começarem a cair no spam, se o Gmail limitar a conta ou se o projeto virar produto. Um domínio adicionado ao mesmo projeto na Vercel mantém `habithub-app.vercel.app` funcionando, então as imagens já coladas não quebram, desde que o projeto continue na Vercel. |

## 5. Riscos e dúvidas técnicas

| Risco ou dúvida | Mitigação ou próximo passo |
|---|---|
| Deslocamento de um dia nas datas, porque o Prisma devolve `DATE` como um `Date` à meia-noite UTC | Um único módulo de conversão, o tipo `CalendarDate` e testes rodando em dois fusos (seção 2.9). |
| O banco do Neon hiberna depois de 5 minutos parado, e a primeira visita seguinte leva até alguns segundos | Aceito na v1. O cache da imagem reduz o problema. Medir em produção antes de pensar em qualquer outra solução. |
| Cota grátis do Neon (100 horas de processamento por mês e 0,5 GB). As imagens dos READMEs acordam o banco | O cache de 1 hora limita a uma geração por hora para cada imagem e tema. Acompanhar o consumo no painel do Neon. |
| Gmail via SMTP: cerca de 500 e-mails por dia, e-mails no spam ou a conta bloqueada pelo Google | Interface `EmailSender` para trocar de provedor, o limite na recuperação de senha e uma conta Gmail usada só pelo app. |
| Falha de sequestro de conta no Better Auth (CVE-2026-53516) | Fixar a versão em 1.6.11 ou mais nova, desligar a união automática e o cadastro pelo GitHub, e cobrir com um teste de integração. |
| O login pelo GitHub não funciona nas versões de teste de cada pull request, porque o GitHub aceita só um endereço de retorno por app | As versões de teste usam login por e-mail. Avaliar um segundo app OAuth para o desenvolvimento local. |
| Uma migração rodar no banco de produção a partir de uma versão de teste mal configurada | O script só age com `VERCEL_ENV=production`, e os previews usam cópias próprias do banco. Revisar as variáveis de ambiente antes do primeiro deploy. |
| O Neon grátis só restaura algumas horas para trás. Um erro fora de uma migração pode apagar a vitrine | Backups antes de cada migração. O autor pode exportar o próprio JSON de vez em quando. |
| Os backups guardam dados de contas excluídas até serem substituídos | Mantendo só os 3 backups mais recentes, esses dados somem depois de 3 migrações. A política de privacidade informa isso. |
| Um nome de usuário liberado pode ser pego por outra pessoa, e então um link antigo do perfil mostra o perfil de outro | Risco aceito para simplificar. As imagens do README não são afetadas. |
| A vitrine depende do uso diário desde o deploy antecipado. Se o autor parar de usar, a grade fica vazia ou desatualizada | Fazer o primeiro deploy o quanto antes e usar todo dia. |
| A versão mínima vai ao ar antes de todas as funcionalidades. Se as versões da configuração não existirem desde o início, os hábitos já criados vão precisar de versões preenchidas retroativamente | Incluir a tabela de versões no esquema desde a primeira migração. |
| Já existe o app "Habit Hub: Routine Tracker" na App Store, do mesmo nicho | Risco aceito, porque o projeto é de portfólio e não tem fins comerciais. |
| O painel pode ter até 20 grades × 371 quadradinhos (cerca de 7.400 elementos), o que pode deixar o app lento no celular | Medir com 20 hábitos num celular mediano. Se ficar lento, simplificar o HTML de cada quadradinho. |
| O README pode mostrar dados com até 1 hora de atraso (inclusive na virada do dia), e o proxy do GitHub pode guardar a imagem por mais tempo | Atraso aceito. Conferir na prática quanto tempo o proxy do GitHub guarda a imagem. |
| ~~Dúvida~~ Resolvido (padrão adotado): mudar o fuso para um que está "atrás" pode deixar a data de início no "futuro" | A data de início não muda. Até ela chegar, o cartão mostra "Começa em …" e não há registro possível. Uma mudança de meta ou agenda feita nesse intervalo vale a partir da data de início. |
| ~~Dúvida~~ Resolvido (padrão adotado): pular um dia que já tem valor | Pular apaga o valor (o banco garante "pulado → valor 0"). A interface pede confirmação dentro do próprio menu (M2). Registrar um valor num dia pulado desfaz o pulo. |
| ~~Dúvida~~ Resolvido (padrão adotado): o visual de cada estado | Vazio = cinza; tons 1 a 4 = cor do hábito; fora da agenda = hachura diagonal; pulado = cinza com um traço no centro; antes do início = só um contorno fraco; hoje = contorno por cima; dias futuros da semana atual não são desenhados. Há uma legenda abaixo de cada grade. |
| ~~Dúvida~~ Resolvido (padrão adotado): limites de meta e valor | Os dois vão até 99.999, e só inteiros (ver seção 2.2). |
| O limite de tentativas identifica o cliente pelo cabeçalho `x-forwarded-for` | Na Vercel esse cabeçalho é preenchido pela própria plataforma, então o cliente não consegue falsificá-lo. Fora da Vercel, seria preciso um proxy que faça o mesmo. Os testes ponta a ponta usam um IP diferente por teste para não esbarrar no limite. |
| Vulnerabilidades apontadas pelo `npm audit` em dependências indiretas: `mysql2` (dependência opcional do Better Auth e do Prisma, mas o projeto não usa MySQL), `deepmerge-ts` (linha de comando do Prisma) e `braces`/`fast-glob` (linha de comando do shadcn) | Nenhuma está no caminho de uma requisição do app. O conserto automático rebaixaria o Prisma para a v6. Revisar quando as dependências publicarem correções. |
