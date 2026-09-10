# Dados de teste — 09/09/2026

Foram adicionadas 12 ofertas, 31 criativos, 932 métricas diárias e 24 registros de metas históricas. O banco gerou 326 resumos diários de ofertas, conferidos contra as métricas dos criativos.

Os nomes aparecem sem prefixo e os identificadores dos criativos começam com CR_20260909. Os registros anteriores foram preservados. Estes dados são fictícios e entram nos totais do painel.

## Roteiro

- Atualize o site. Confira Hoje, 7 dias, 30 dias, período personalizado e histórico completo.
- Busque pelo nome da campanha. Experimente filtros de país, nicho, status, fonte e responsável.
- Confira paginação, ordenação, cartões no celular e tabelas no computador.
- Abra as campanhas lucrativa, em atenção e com prejuízo. Compare cores, ROAS, IC, CPC e totais.
- Abra a campanha de investimento alto e a de nome longo. Confira valores extensos e quebra de texto.
- Use a campanha com conversões zeradas para conferir divisões por zero e dias sem investimento.
- Use a nova oferta sem métricas para cadastrar criativos e lançar dados manualmente.
- A campanha multicanal também tem um criativo sem métricas para testar o primeiro lançamento.
- Edite um registro demonstrativo. Cancele para verificar o aviso de alterações não salvas.
- Arquive uma oferta ou um criativo demonstrativo. Experimente Desfazer.
- No arquivo, restaure a oferta com criativos vinculados. Na outra, selecione apenas alguns criativos.
- A oferta arquivada vazia está disponível para testar exclusão sem dependências.
- Há criativos arquivados individualmente, com ofertas ainda ativas.
- Há links de vídeo MP4 e YouTube, um link sem vídeo e criativos sem URL. Os links externos dependem da disponibilidade de seus provedores.
- Compare as metas de mais de dez dias atrás com as atuais.

## Limite observado

A carga confirmou que o banco calcula ROAS e outros indicadores automaticamente. O importador CSV atual ainda envia indicadores calculados no código; esse fluxo pode ser rejeitado pelo banco e precisa de uma correção específica. A inserção dos dados não valida todos os fluxos de edição do site.

## Repetição da carga

O script `scripts/seed-test-data.mjs` usa a configuração pública da versão publicada. Sem argumentos, apenas consulta exemplos. Com `--apply`, cria a carga para a data atual de São Paulo. Usa IDs determinísticos para não duplicar a mesma carga no mesmo dia e não atualiza registros existentes. Executá-lo em outro dia cria outra carga.
