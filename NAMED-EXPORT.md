# Identificação Factor X

O gerador mantém COPIAR/COPIAR TODAS como endereços puros. A marca não é enviada como usuário, senha, cookie ou sufixo IP:porta.

Após gerar, a seção NOME FACTOR X NO SEU CLIENTE permite copiar ou baixar `factor-x-mihomo.yaml`. É um perfil JSON (representação válida de YAML) para clientes baseados no núcleo Mihomo/Clash Meta. Cada entrada contém `name: Factor X | protocolo | IP:porta`, separado de `server` e `port`.

Somente HTTP e SOCKS5 são exportados. SOCKS4 não é convertido para SOCKS5; HTTPS é omitido porque o verificador legado não comprova TLS entre cliente e proxy. A tela informa a quantidade omitida. Não são inventadas credenciais nem desativadas verificações TLS. Entradas repetidas ou inválidas são removidas.

Importe como novo perfil, preservando a configuração anterior. Ativar o perfil encaminha o tráfego enviado ao cliente para a proxy escolhida no grupo Factor X. O arquivo não habilita TUN nem acesso pela rede local. A aplicação não ativa configurações de rede automaticamente.

Este nome é somente um rótulo no cliente, não identificação universal nem prova de propriedade da proxy pública. Clientes que aceitam apenas IP:porta precisam da cópia simples. Nenhum formato garante disponibilidade futura da proxy.

Referências oficiais:
- https://wiki.metacubex.one/en/config/proxies/http/
- https://wiki.metacubex.one/en/config/proxies/socks/
- https://wiki.metacubex.one/en/config/proxy-groups/select/

Validação: testes de serialização, nomes únicos, campos de conexão intactos, omissões e entrada inválida. `scripts/check-named-profile.ts` gera proxies reais pela API pública e chama o binário oficial Mihomo com `-t`, que valida o perfil sem iniciar serviço. Não confundir validação do perfil com comprovação de conectividade de todos os clientes gráficos.

Não há nova dependência de runtime, banco, worker ou serviço pago. Continuam valendo as limitações gratuitas e de uso não comercial da Vercel Hobby.
