# FactorX — modo sob demanda

O caminho público não lê nem grava o estoque PostgreSQL. Dados e migrations antigos foram preservados; não representam proxies atualmente verificadas. Nenhum serviço Render foi contratado.

- `/api/proxies?limit=10`: coleta fontes, deduplica e testa agora. Limite estrito: 1–50. `country=BR` exige país de saída confirmado, não apenas informado pela lista.
- Fontes: ProxyScrape, Relayglass, Proxifly e Monosans, consultadas em paralelo e isoladas contra falhas. Aproveita os leitores existentes.
- Cache de candidatas em memória: 5 minutos por instância; não há garantia de cache compartilhado entre instâncias serverless. Uma instância nova consulta as fontes novamente. Não há agendamento: o primeiro pedido após expiração atualiza as listas.
- Cada resposta contém apenas aprovações deste pedido; quantidade parcial e ausência de resultados são explícitas. Não existe garantia de 10/50 aprovadas nem de funcionamento posterior.
- Orçamento: 50 segundos, função Vercel limitada a 60; 3 segundos por teste incluindo enriquecimento, até 24 conexões simultâneas e 600 testes por solicitação. Até 2 solicitações simultâneas por instância. Cada lote respeita o déficit do pedido.
- Limite em memória: 3 pedidos/minuto por IP por instância, não um limitador global. Em escala distribuída será necessário limite compartilhado/WAF. Não configura gastos nem faz upgrade automático.
- IPs privados/reservados, credenciais de proxy nas listas e redirecionamentos do teste são bloqueados. Somente IPv4 público nesta versão.
- `PROXY_VALIDATION_URL` e `GEOLOOKUP_URL` continuam com padrões gratuitos HTTPS. DATABASE_URL é opcional para o gerador, mantida apenas para histórico administrativo legado.
- `/api/status` informa modo e limites, não estoque. A rota administrativa de manutenção retorna 410; o worker antigo permanece no repositório para referência, mas não deve ser iniciado neste modo.
- `npx tsx --env-file=.env scripts/check-on-demand.ts`: teste real que imprime apenas contagens e tempos, nunca credenciais.

Vercel Hobby e demais serviços gratuitos têm limites e condições de uso (inclusive elegibilidade comercial). Gratuito não significa ilimitado. Revise essas condições antes de oferecer o serviço comercialmente; ao atingir limites, o serviço pode ficar indisponível. Não use loops de keep-alive nem jobs artificiais para contornar limites.
