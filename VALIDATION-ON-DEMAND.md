# Validação real — 2026-09-02

URL pública: https://factorx-lime.vercel.app

## Fluxo publicado

- Clique no gerador com quantidade padrão 10: 10 aprovadas, 47 candidatas testadas; resultados visíveis na interface.
- API com limite 50: 48 aprovadas em 50,7 segundos, 206 candidatas testadas; resposta explicitamente parcial. As 48 eram únicas e os horários de validação pertenciam à solicitação.
- API com país BR e limite 1: 1 aprovada em 2 testes, com país de saída BR confirmado.
- Quantidades 0 e 51 e protocolo inválido: HTTP 400.
- Dashboard legado sem autenticação: HTTP 401.
- Páginas /admin, /terms e /privacy: HTTP 200.
- API /api/status: modo on-demand, máximo 50.
- Teste real local independente: 10 aprovadas em 57 testes e 37,6 segundos. Quatro fontes disponíveis.

Estes resultados são observações pontuais, não garantias de disponibilidade futura. Nenhuma proxy foi inventada para completar pedidos.

## Recursos e segurança

Não foi contratado plano Render nem outro serviço pago. O gerador não usa o estoque antigo do Supabase; banco, migrations e dados históricos foram preservados.

Cache é temporário e local a cada instância, não um cron. Testes reais ocorrem a cada solicitação, inclusive quando as candidatas vêm do cache. Os limites de tráfego em memória não substituem limitação distribuída sob grande volume.

Vercel Hobby é sujeito a franquias e restrição de uso pessoal/não comercial: https://vercel.com/docs/plans/hobby . Esta validação não autoriza uso comercial incompatível com o plano gratuito.

O painel da Vercel apresentou sugestão de autenticação em duas etapas; a automação não dispensou o aviso nem alterou a segurança da conta. A publicação foi confirmada pelo status público da integração GitHub e pelos testes na URL pública.
