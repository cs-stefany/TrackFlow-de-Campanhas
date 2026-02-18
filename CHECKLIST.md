# TrackFlow — Checklist de Desenvolvimento

Acompanhamento do progresso de implementação do sistema.

---

## Fase 1 — MVP Manual

### 1.1 Infraestrutura
- [x] Projeto Supabase criado e configurado
- [x] Tabelas criadas conforme schema revisado
- [ ] Row Level Security (RLS) configurado
- [ ] Backup automático ativado (requer plano Pro no Supabase)
- [ ] Projeto Vercel conectado ao repositório

### 1.2 Autenticação
- [ ] Login funcional (email/senha ou magic link)
- [ ] Toda a equipe consegue acessar
- [ ] Sessão persiste entre acessos

### 1.3 Tela Home (Dashboard)
- [x] Resumo geral com KPIs consolidados de todas as ofertas
- [x] Cards de ofertas carregando do banco
- [x] Indicador de saúde (bolinha verde/amarelo/vermelho) funcionando
- [x] Métricas: Spend Hoje, ROAS Hoje, criativos por status
- [x] Click no card navega para oferta
- [x] Loading state enquanto carrega
- [x] Empty state se não houver ofertas

### 1.4 Tela Oferta — Resultado Diário
- [x] Cards de totais do período (Spend, ROAS, Faturamento, Lucro)
- [x] Tabela de resultado por dia com todas as colunas
- [x] Cores automáticas em ROAS, IC, CPC baseadas nos thresholds da oferta
- [x] Filtro de período funcionando (Hoje, 7d, 30d, Custom)
- [x] Ordenação por coluna

### 1.5 Tela Oferta — Criativos FB/YT/TT
- [x] Abas separadas por fonte
- [x] Contagem de criativos no título da aba
- [x] Tabela com todas as colunas especificadas
- [x] Cores automáticas em ROAS, IC, CPC
- [x] Filtro por status funcionando
- [x] Ordenação clicável nas colunas ROAS, IC, CPC
- [x] Busca por ID funcionando

### 1.6 CRUD de Ofertas
- [x] Criar nova oferta com todos os campos
- [x] Configurar thresholds personalizados
- [x] Editar oferta existente
- [x] Pausar/ativar oferta
- [x] Arquivar oferta (soft delete)

### 1.7 CRUD de Criativos
- [x] Criar novo criativo vinculado a oferta
- [x] Campos: ID único, fonte, copy, status, URL, observações
- [x] Editar criativo existente
- [x] Alterar status com um clique (dropdown na tabela)
- [x] Validação de ID único (não pode duplicar)

### 1.8 Input de Métricas
- [x] Formulário de input manual por criativo
- [x] Bulk upload via CSV funcional
- [x] Validação de dados antes de salvar
- [x] Preview com highlight de erros
- [x] Mensagem de sucesso/erro clara

### 1.9 Performance e UX
- [ ] Tempo de carregamento < 2 segundos
- [ ] Interface responsiva (funciona no celular)
- [x] Feedback visual em todas as ações (loading, success, error)
- [ ] Não há erros no console do navegador

### 1.10 Qualidade
- [ ] Testado com dados reais de pelo menos 1 oferta
- [ ] Equipe consegue usar sem treinamento extenso
- [x] Documentação básica de uso criada (README)

---

## Fase 2 — Implementações Adicionais

### 2.1 Upload e Gestão de Vídeos
- [ ] Upload de vídeos direto no sistema (não depender só de URL externa)
- [ ] Sistema de pastas para organizar vídeos por oferta/fonte
- [ ] Vincular vídeo do acervo ao criativo (ao invés de colar URL manualmente)
- [ ] Preview do vídeo no sistema após upload
- [ ] Limite de tamanho e formatos aceitos definidos

### 2.2 Métrica de Conversão de Checkout
- [ ] Remover CTR e CPM das métricas exibidas
- [ ] Adicionar métrica "Conversão de Checkout" (Compras / Inicializações de Checkout)
- [ ] Campo de "Inicializações de Checkout" no lançamento de métricas
- [ ] Campo de "Compras" no lançamento de métricas
- [ ] Cálculo automático da taxa de conversão de checkout
- [ ] Exibir conversão de checkout nas tabelas de métricas
- [ ] Atualizar import CSV para aceitar os novos campos

### 2.3 Autenticação e Permissões
- [ ] Sistema de login implementado
- [ ] Controle de acesso por papel (admin, operador, visualizador)
- [ ] RLS no Supabase vinculado ao usuário logado

### 2.4 Deploy e Infraestrutura
- [ ] Deploy em produção (Vercel ou similar)
- [ ] Domínio customizado configurado
- [ ] SSL/HTTPS funcionando
- [ ] Backup automático do banco
