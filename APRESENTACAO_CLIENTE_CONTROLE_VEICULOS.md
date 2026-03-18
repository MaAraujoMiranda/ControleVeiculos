# Proposta de Sistema de Controle de Veiculos

## 1. Objetivo

Desenvolver um sistema proprio para controle de veiculos e clientes do estacionamento, substituindo a dependencia operacional da WPS e o uso de planilhas manuais por uma solucao mais organizada, bonita, intuitiva e preparada para evolucao.

O foco inicial sera uma versao web, com estrutura profissional e pronta para futuras expansoes.

## 2. Problema Atual

Hoje o processo depende de:

- Sistema WPS com limitacoes para alteracao e controle de informacoes.
- Planilha Excel como apoio operacional.
- Dificuldade para localizar dados rapidamente.
- Baixa padronizacao das informacoes.
- Risco maior de erro manual, retrabalho e perda de historico.

## 3. Solucao Proposta

Criar um sistema de controle de veiculos com cadastro simples, busca rapida e tela intuitiva para uso diario.

O sistema sera pensado para atender a operacao atual desde o inicio, com uma base bem estruturada para facilitar qualquer ajuste futuro sem retrabalho.

## 4. Formatos de Entrega

### Opcao 1. Sistema Local

- Instalado na maquina ou rede local do cliente.
- Pode funcionar sem login diario obrigatorio.
- Controle centralizado no proprio local.
- Ideal para operacao interna com menor custo recorrente.

### Opcao 2. Sistema Online

- Acesso por computador, tablet e celular.
- Login seguro.
- Sessao persistente por pelo menos 7 dias para evitar logins frequentes no uso diario.
- Acesso de qualquer lugar.
- Estrutura ideal para expansao, suporte e backup centralizado.

## 5. Beneficios Para o Cliente

- Busca rapida por placa, nome, CPF ou numero do cartao.
- Cadastro mais organizado e padronizado.
- Menor dependencia de planilhas.
- Processo mais rapido no atendimento diario.
- Interface moderna e responsiva.
- Possibilidade de anexar foto da pessoa e foto do veiculo.
- Estrutura pronta para crescimento futuro.
- Mais seguranca e rastreabilidade das informacoes.

## 6. Escopo Inicial do Sistema

O projeto inicial sera baseado nas colunas ja usadas na planilha atual, com alguns complementos importantes.

### Campos principais do cadastro

- Numero do cartao WPS.
- Campo TR SL.
- Nome do cliente.
- Telefone.
- CPF.
- Placa do veiculo.
- Marca e modelo.
- Cor.
- Modalidade.

### Novos recursos incluidos no escopo inicial

- Foto da pessoa opcional.
- Foto do veiculo opcional.
- Busca com filtros rapidos.
- Interface responsiva.
- Estrutura preparada para futuras alteracoes.

### Campos obrigatorios no inicio

- Nome.
- Telefone.
- CPF.

Os demais campos seguirao a estrutura da planilha atual, podendo ser ajustados depois da primeira validacao com o cliente.

## 7. Regras de Negocio Ja Definidas

- O sistema deve aceitar placa no padrao antigo e tambem no padrao Mercosul.
- A estrutura permitira controlar se um cliente pode ou nao ter mais de um veiculo.
- Essa regra ficara em uma aba de configuracoes, com opcao de habilitar ou desabilitar.
- O projeto sera feito com padronizacao alta para facilitar mudancas futuras.
- A primeira demonstracao sera baseada no que ja existe hoje, para agilizar a apresentacao comercial.

## 8. Diferenciais do Projeto

- Sistema pensado em cima do processo real do cliente.
- Visual moderno, simples e profissional.
- Arquitetura preparada para mais de um usuario logado sem travamentos.
- Tratamento de erros e validacoes bem definidos.
- Estrutura segura, organizada e pronta para crescimento.
- Base tecnologica moderna para facilitar manutencao e novas funcionalidades.

## 9. Visual e Experiencia

Direcao visual sugerida:

- Estilo elegante e operacional.
- Modo claro e modo escuro.
- Cores principais com identidade premium e confiavel.
- Tela limpa, com foco em velocidade de uso.
- Tipografia moderna e facil de ler.

Paleta sugerida:

- Fundo claro: `#F7F3EA`
- Superficie clara: `#FFFFFF`
- Texto principal: `#1F2937`
- Dourado destaque: `#C89B3C`
- Fundo escuro: `#0F172A`
- Superficie escura: `#111827`
- Texto claro: `#E5E7EB`
- Dourado escuro destaque: `#D4A840`

Tipografia sugerida:

- Titulos: `Sora`
- Textos e formularios: `IBM Plex Sans`
- Campos tecnicos como placa e cartao: `JetBrains Mono`

## 10. Tecnologias Recomendadas

Para garantir modernidade, seguranca, manutencao simples e boa performance:

- Frontend: Next.js com React e TypeScript.
- Backend: NestJS com TypeScript.
- Banco de dados: MySQL.
- API documentada e padronizada.
- Estrutura pronta para rodar localmente ou online.
- Ambiente preparado para Docker e deploy em VPS.

## 11. Estrategia de Entrega

### Fase 1. Prototipo funcional para apresentacao

- Criar a estrutura inicial com os campos atuais da planilha.
- Incluir fotos opcionais.
- Aplicar busca e filtros principais.
- Deixar o sistema visualmente bonito e organizado.

### Fase 2. Validacao com o cliente

- Apresentar o sistema em video.
- Coletar ajustes necessarios.
- Confirmar campos adicionais e regras extras.

### Fase 3. Refinamento e producao

- Ajustar detalhes finais.
- Fortalecer seguranca, auditoria, backup e publicacao.
- Subir em ambiente local ou online conforme fechamento comercial.

## 12. Modelo Comercial Sugerido

### Versao Local

- Valor unico de implantacao.
- Possibilidade de cobrar suporte ou manutencao opcional.

### Versao Online

- Valor de implantacao.
- Mensalidade recorrente para cobrir dominio, VPS, backup, manutencao e suporte.

## 13. Frase de Fechamento Para Apresentacao

Em vez de continuar dependendo de um sistema engessado e de planilhas manuais, a proposta e entregar um sistema proprio, simples de usar, bonito, seguro e preparado para crescer junto com a operacao do estacionamento.

## 14. Roteiro Curto Para Video

1. Mostrar o problema atual com planilha e dependencia da WPS.
2. Apresentar a proposta de um sistema proprio.
3. Explicar as duas opcoes: local e online.
4. Mostrar os dados principais do cadastro.
5. Destacar busca rapida, fotos opcionais e uso responsivo.
6. Reforcar que a estrutura foi pensada para futuras evolucoes.
7. Fechar com os beneficios operacionais e comerciais.
