# Plano de Execucao do Projeto Controle de Veiculos

## 1. Objetivo do Projeto

Construir um sistema web moderno para controle de clientes e veiculos de estacionamento, substituindo planilhas e reduzindo a dependencia operacional do sistema atual, com foco em simplicidade de uso, boa apresentacao visual, seguranca, padronizacao e facilidade de manutencao.

## 2. Premissas Confirmadas Ate Agora

- O foco inicial sera a versao web.
- Nao faz parte do escopo atual uma versao local ou desktop.
- O sistema sera construido do zero, com estrutura propria e modelagem pensada para o negocio.
- Serao adicionados dados pessoais do cliente e fotos opcionais.
- Campos obrigatorios no MVP: nome, telefone e CPF.
- Fotos da pessoa e do veiculo nao serao obrigatorias.
- O sistema deve aceitar placa no padrao antigo e Mercosul.
- O tempo de sessao do login deve permanecer ativo por pelo menos 7 dias.
- Deve existir uma aba de configuracoes para permitir ou bloquear a regra de mais de um veiculo por cliente.
- A estrutura deve facilitar alteracoes futuras sem retrabalho relevante.
- A planilha atual podera ser usada apenas como apoio para consulta ou importacao futura, sem definir a arquitetura do sistema.

## 3. Requisitos Funcionais do MVP

### Cadastros

- Cadastrar cliente.
- Cadastrar veiculo.
- Vincular cliente ao veiculo.
- Vincular cartao WPS ao cadastro.
- Permitir upload de foto da pessoa.
- Permitir upload de foto do veiculo.

### Campos iniciais do cadastro

- Cartao.
- TR SL.
- Nome do cliente.
- Telefone.
- CPF.
- Placa.
- Marca/modelo.
- Cor.
- Modalidade.

### Busca e filtros

- Busca por placa.
- Busca por nome.
- Busca por CPF.
- Busca por numero do cartao.
- Filtros rapidos por modalidade e status.

### Configuracoes

- Permitir ou nao mais de um veiculo por cliente.
- Configuracao de sessao do sistema.
- Parametros basicos para evolucao futura.

### Operacao

- Listagem simples e rapida.
- Cadastro e edicao intuitivos.
- Feedback visual de sucesso, erro e carregamento.
- Responsividade para celular, tablet e desktop.

## 4. Requisitos Nao Funcionais

- Interface bonita, simples e profissional.
- Arquitetura moderna e padronizada.
- API segura e bem documentada.
- Tratamento centralizado de erros.
- Performance adequada para mais de um usuario simultaneo.
- Otimizacao de consultas ao banco.
- Facilidade de implantacao web em VPS.
- Facilidade de manutencao e mudancas futuras.

## 5. Stack Recomendada

### Frontend

- Next.js 16
- React
- TypeScript
- Tailwind CSS
- TanStack Query para consumo de API e controle de cache
- React Hook Form com Zod para formularios e validacao

### Backend

- NestJS 11
- TypeScript
- Prisma ORM
- MySQL 8
- Swagger/OpenAPI

### Infraestrutura

- Docker
- Docker Compose
- Nginx como proxy reverso
- VPS Ubuntu Hostinger

## 6. Arquitetura Recomendada

### Estrutura geral

- Monorepo com `pnpm workspaces`
- Pasta `web` para frontend
- Pasta `api` para backend
- Pasta `packages` para tipos, schemas e utilitarios compartilhados

### Padrao arquitetural

- Frontend separado do backend
- API REST versionada em `/api/v1`
- Camadas bem definidas no backend:
  - controller
  - service
  - repository
  - dto
  - entity/model
- Validacao de entrada na borda da aplicacao
- Regras de negocio isoladas da camada HTTP

### Estrategia de deploy

- Um container para `web`
- Um container para `api`
- Banco de dados MySQL em servico dedicado existente ou container isolado, conforme validacao no servidor
- Nginx apontando o dominio principal para o frontend e `/api` para o backend

## 7. Modelagem Inicial de Dados

### Tabela `clientes`

- `id`
- `nome`
- `telefone`
- `cpf`
- `foto_pessoa_url`
- `created_at`
- `updated_at`
- `deleted_at`

### Tabela `veiculos`

- `id`
- `cliente_id`
- `placa`
- `placa_normalizada`
- `marca_modelo`
- `cor`
- `foto_veiculo_url`
- `created_at`
- `updated_at`
- `deleted_at`

### Tabela `cadastros_estacionamento`

- `id`
- `cliente_id`
- `veiculo_id`
- `numero_cartao`
- `tr_sl`
- `modalidade`
- `status`
- `observacoes`
- `created_at`
- `updated_at`
- `deleted_at`

### Tabela `usuarios`

- `id`
- `nome`
- `email`
- `senha_hash`
- `perfil`
- `ativo`
- `created_at`
- `updated_at`

### Tabela `configuracoes`

- `id`
- `permite_multiplos_veiculos_por_cliente`
- `duracao_sessao_dias`
- `created_at`
- `updated_at`

### Tabela `auditoria`

- `id`
- `usuario_id`
- `acao`
- `entidade`
- `entidade_id`
- `dados_anteriores`
- `dados_novos`
- `ip`
- `user_agent`
- `created_at`

## 8. Regras de Negocio Iniciais

- Nome, telefone e CPF sao obrigatorios.
- CPF deve ser validado no backend e frontend.
- Placa deve aceitar padrao antigo e Mercosul.
- O sistema deve normalizar placa para busca.
- O sistema deve permitir definir por configuracao se um cliente pode possuir mais de um veiculo.
- Quando a configuracao estiver desabilitada, nao deve ser permitido salvar segundo veiculo para o mesmo cliente.
- Fotos sao opcionais.
- O login deve manter sessao valida por 7 dias, com renovacao controlada e segura.

## 9. Estrategia de Autenticacao Web

- Login com email e senha.
- Access token de curta duracao.
- Refresh token armazenado em cookie `httpOnly`.
- Sessao persistente por 7 dias.
- Logout invalida refresh token.
- Protecao contra tentativas excessivas de login.

## 10. Padroes de Qualidade

### Backend

- DTOs com validacao.
- Exception filter global.
- Logger estruturado.
- Resposta padronizada de erro.
- Versionamento de API.
- Documentacao Swagger.
- Controle de CORS por ambiente.
- Helmet ativo.
- Rate limit em rotas sensiveis.

### Frontend

- Componentes reutilizaveis.
- Paginas com estados de loading, erro e vazio.
- Formularios padronizados.
- Tabelas e filtros consistentes.
- Modo claro e escuro.

### Banco de dados

- Indices em campos de busca.
- Revisao de consultas criticas com `EXPLAIN ANALYZE`.
- Soft delete para evitar perda acidental.
- Migrations versionadas.

## 11. Performance e Otimizacao

- Indices para `placa_normalizada`, `numero_cartao`, `cpf` e `nome`.
- Paginacao em listagens.
- Busca com debounce no frontend.
- Upload com limite de tamanho e compressao.
- Evitar consultas `SELECT *`.
- Evitar N+1 queries.
- Validar pool de conexao do banco no ambiente web em producao.
- Preparar a API para mais de um usuario simultaneo sem travamentos.

## 12. Tratamento de Erros

### API

- Padrao unico para erros:
  - `code`
  - `message`
  - `details`
  - `traceId`
  - `timestamp`
- Erros de validacao claros para o frontend.
- Logs detalhados para erro interno sem expor dados sensiveis ao usuario.

### Frontend

- Mensagens amigaveis.
- Feedback visual sem travar a tela.
- Reenvio seguro em acoes idempotentes.
- Fallbacks para erro de conexao e timeout.

## 13. Identidade Visual Recomendada

### Paleta

- Claro:
  - `#F7F3EA`
  - `#FFFFFF`
  - `#1F2937`
  - `#C89B3C`
- Escuro:
  - `#0F172A`
  - `#111827`
  - `#E5E7EB`
  - `#D4A840`

### Tipografia

- Titulos: `Sora`
- Texto geral: `IBM Plex Sans`
- Campos tecnicos: `JetBrains Mono`

## 14. Fases do Projeto

### Fase 0. Descoberta e alinhamento

- Validar significado do campo `TR SL`.
- Confirmar modalidades existentes.
- Confirmar se havera mais campos alem do escopo inicial ja definido.
- Confirmar se o cliente deseja historico, exportacao e perfis de usuario no MVP.

### Fase 1. Definicao funcional e UX

- Organizar lista oficial de campos.
- Desenhar fluxos principais.
- Definir layout das telas:
  - login
  - dashboard
  - listagem
  - cadastro
  - configuracoes
- Definir componentes base do design system.

### Fase 2. Estrutura do projeto

- Criar monorepo.
- Configurar lint, formatacao, aliases e variaveis de ambiente.
- Configurar Docker para desenvolvimento.
- Configurar conexao com MySQL no WSL.
- Definir convencoes de codigo e nomenclatura.

### Fase 3. Banco e backend base

- Modelar banco.
- Criar migrations.
- Configurar Prisma.
- Criar NestJS com modulos iniciais.
- Implantar validacao, auth, logs, filtros de excecao e Swagger.

### Fase 4. Frontend base

- Criar Next.js com layout principal.
- Implementar tema claro/escuro.
- Criar sistema de autenticacao.
- Criar componentes compartilhados.
- Integrar consumo da API.

### Fase 5. MVP funcional

- Login.
- Listagem de cadastros.
- Cadastro e edicao de cliente.
- Cadastro e edicao de veiculo.
- Vinculo de cartao.
- Upload de fotos.
- Busca e filtros.
- Configuracao de multiplos veiculos por cliente.

### Fase 6. Qualidade e seguranca

- Revisar validacoes.
- Implementar auditoria de alteracoes.
- Revisar regras de permissao.
- Cobrir fluxos criticos com testes.
- Validar queries mais pesadas.

### Fase 7. Homologacao

- Avaliar se havera necessidade de importar dados da planilha atual.
- Corrigir dados inconsistentes.
- Ajustar layout e nomenclaturas.
- Gravar video de apresentacao.
- Receber feedback do cliente.

### Fase 8. Producao

- Preparar ambiente da VPS.
- Publicar containers.
- Configurar Nginx.
- Configurar dominio e SSL.
- Testar funcionamento completo.

### Fase 9. Pos-implantacao

- Monitorar erros.
- Ajustar pequenos pontos.
- Planejar fase 2 com melhorias solicitadas.

## 15. Plano de Desenvolvimento no Seu Ambiente

### Ambiente de desenvolvimento

- Windows com WSL para desenvolvimento.
- MySQL no WSL.
- Docker no Windows.

### Recomendacoes

- Manter o codigo dentro do filesystem Linux do WSL para melhor performance.
- Nao usar usuario `root` da aplicacao em ambiente final.
- Criar usuario de banco dedicado ao projeto.
- Separar variaveis de ambiente por `development`, `staging` e `production`.

## 16. Plano de Producao na VPS Hostinger

### Estrutura sugerida

- Criar pasta do projeto em `/aiz/CONTROLEVEICULOS`
- Criar `docker-compose.yml` proprio
- Criar `.env` proprio
- Publicar com containers independentes de outros projetos

### Verificacoes obrigatorias antes do deploy

- Conferir containers ativos:
  - `docker ps`
- Conferir stacks docker:
  - `docker compose ls`
- Conferir processos PM2:
  - `pm2 list`
- Conferir portas em uso:
  - `ss -tulpn`
- Conferir configuracao Nginx:
  - `nginx -t`
- Conferir vhosts e apontamentos:
  - `ls /etc/nginx/sites-enabled`
- Conferir espaco em disco:
  - `df -h`
- Conferir memoria:
  - `free -h`

### Banco de dados

- Verificar se o MySQL da VPS suportara mais esse projeto.
- Criar database exclusivo.
- Criar usuario exclusivo com permissoes minimas necessarias.
- Validar charset `utf8mb4`.
- Executar migrations versionadas.
- Gerar backup antes da publicacao.

### Rede e portas

- Mapear todas as portas ja usadas.
- Evitar expor API e MySQL publicamente.
- Preferir acesso pelo Nginx na porta 80/443.
- Se necessario usar porta interna exclusiva para `web` e `api`.

### Nginx

- Usar o mesmo dominio para frontend e API quando possivel.
- Encaminhar `/api` para o backend.
- Encaminhar `/` para o frontend.
- Ativar HTTPS com certificado valido.
- Ajustar `client_max_body_size` para upload de fotos.
- Configurar timeouts adequados.

### CORS

- Em desenvolvimento, liberar apenas `localhost` e ambientes de teste.
- Em producao, liberar apenas o dominio oficial.
- Preferir mesma origem para reduzir risco de erro.

### Publicacao

- Subir primeiro em homologacao, se possivel.
- Rodar migrations.
- Subir containers.
- Validar saude da API.
- Validar telas principais.
- Executar smoke test.

## 17. Checklist de Smoke Test de Producao

- Acessar o sistema pelo dominio final.
- Fazer login.
- Confirmar permanencia de sessao.
- Cadastrar cliente.
- Cadastrar veiculo.
- Validar placa antiga.
- Validar placa Mercosul.
- Subir foto da pessoa.
- Subir foto do veiculo.
- Buscar por nome.
- Buscar por placa.
- Buscar por cartao.
- Alterar cadastro.
- Validar regra de multiplos veiculos ligada.
- Validar regra de multiplos veiculos desligada.
- Confirmar logs e auditoria.

## 18. Riscos e Prevencoes

### Risco: necessidade futura de aproveitar dados da planilha atual

Prevencao:

- Tratar a planilha apenas como fonte opcional de migracao.
- Fazer importacao controlada somente se for realmente necessario.
- Normalizar dados antes de subir.
- Identificar duplicidades de CPF, cartao e placa.

### Risco: conflito com outros projetos na VPS

Prevencao:

- Levantar portas, containers, PM2 e Nginx antes de publicar.
- Isolar o projeto em rede e configuracao propria.

### Risco: CORS quebrado ou rota errada no proxy

Prevencao:

- Usar o mesmo dominio para web e API.
- Testar em homologacao antes do ambiente final.

### Risco: sessao expirar cedo demais

Prevencao:

- Definir politica de sessao com persistencia minima de 7 dias.
- Implementar refresh token seguro.

### Risco: lentidao em busca

Prevencao:

- Indices corretos.
- Paginacao.
- Consulta otimizada e revisada com `EXPLAIN ANALYZE`.

## 19. Entregaveis Imediatos Para Proximas Sessoes

- Definicao oficial dos campos do MVP.
- Definicao do significado de `TR SL`.
- Confirmacao do escopo somente web para esta fase.
- Confirmacao de dominio/subdominio do projeto.
- Levantamento da situacao atual da VPS antes da implantacao.

## 20. Resultado Esperado

Ao final do projeto, o cliente tera um sistema proprio, organizado, simples de operar, bonito visualmente, responsivo, seguro e preparado para futuras mudancas sem necessidade de reconstruir a base do sistema.
