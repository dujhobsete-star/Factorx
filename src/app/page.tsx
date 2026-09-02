"use client";
import { useEffect, useState } from "react";
import { Check, Copy, Globe2, RefreshCw, ShieldCheck, Zap } from "lucide-react";
import { buildNamedProfile, factorXName, proxyAddress } from "@/lib/proxy/export";

type ProxyItem = { id:string; ip:string; port:number; protocol:string; countryCode?:string; latencyMs?:number; lastCheckedAt:string; brVerified:boolean };
export default function Home() {
  const [items,setItems]=useState<ProxyItem[]>([]);
  const [loading,setLoading]=useState(false);
  const [elapsed,setElapsed]=useState(0);
  const [copied,setCopied]=useState("");
  const [message,setMessage]=useState("");
  const [country,setCountry]=useState("");
  const [protocol,setProtocol]=useState("");
  const [limit,setLimit]=useState("10");
  const [quality,setQuality]=useState("ALL");
  const [withProtocol,setWithProtocol]=useState(true);
  useEffect(()=>{
    if (!loading) return;
    const timer=setInterval(()=>setElapsed(v=>v+1),1000);
    return()=>clearInterval(timer);
  },[loading]);
  const address=(p:ProxyItem)=>proxyAddress(p,withProtocol);
  const namedProfile=buildNamedProfile(items);
  function downloadNamed() {
    if(!namedProfile.count)return;
    const url=URL.createObjectURL(new Blob([namedProfile.text],{type:"application/yaml;charset=utf-8"}));
    const link=document.createElement("a");link.href=url;link.download="factor-x-mihomo.yaml";link.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  async function generate() {
    setLoading(true);setElapsed(0);setItems([]);setMessage("");
    const query=new URLSearchParams({limit,quality,...(country&&{country}),...(protocol&&{protocol})});
    try {
      const response=await fetch(`/api/proxies?${query}`,{cache:"no-store",signal:AbortSignal.timeout(60_000)});
      if(response.status===429){setMessage("Limite de solicitações atingido ou servidor ocupado. Aguarde 1 minuto e tente novamente.");return;}
      if(!response.ok)throw new Error();
      const data=await response.json();
      setItems(data.proxies??[]);setMessage(`${data.message} ${data.tested} candidatas testadas.`);
    } catch {setMessage("Não foi possível concluir os testes agora. Tente novamente em instantes.");}
    finally {setLoading(false);}
  }
  async function copy(text:string,key:string) {
    try {await navigator.clipboard.writeText(text);setCopied(key);setTimeout(()=>setCopied(""),1800);}
    catch {setMessage("O navegador não permitiu copiar. Selecione e copie o endereço manualmente.");}
  }
  return <main>
    <header className="header"><a className="brand" href="#top"><span>FACTOR</span><b>X</b><i>{"// PROXYS"}</i></a><nav><a href="#generator">Gerador</a><a href="#network">Rede</a><a href="#how">Como funciona</a></nav><a className="button compact" href="#generator">GERAR PROXY</a></header>
    <section className="hero" id="top"><div className="grid-bg"/><div className="x-mark" aria-hidden="true"><i/><i/></div><div className="hero-copy"><div className="eyebrow"><span className="pulse"/> FACTORX // SOB DEMANDA</div><h1>VOCÊ PEDE.<br/><em>A GENTE TESTA.</em></h1><p>Proxies públicas, verificadas no seu pedido. Buscamos nas fontes gratuitas, fazemos um teste real e entregamos somente as aprovadas.</p><div className="actions"><a className="button" href="#generator">GERAR PROXY <Zap size={16}/></a><a className="button ghost" href="#how">COMO FUNCIONA</a></div></div><div className="hero-stats"><Stat value="50" label="MÁXIMO POR PEDIDO"/><Stat value="5 MIN" label="CACHE DAS LISTAS"/><Stat value="NA HORA" label="TESTE DE CADA PROXY"/><Stat value="GRÁTIS" label="FONTES PÚBLICAS"/></div></section>
    <section className="section generator" id="generator"><div className="section-tag">{"// ACCESS NODE"}</div><div className="section-head"><div><h2>FACTORX PROXY<br/><span>GENERATOR</span></h2><p>Escolha a quantidade. Aguarde o teste. Copie as aprovadas.</p></div></div><div className="generator-panel"><div className="filters">
      <Field label="LOCALIZAÇÃO"><select value={country} disabled={loading} onChange={e=>setCountry(e.target.value)}><option value="">Todos os países</option><option value="BR">Brasil — saída verificada</option></select></Field>
      <Field label="PROTOCOLO"><div className="segmented">{["","HTTP","HTTPS","SOCKS4","SOCKS5"].map(p=><button disabled={loading} className={protocol===p?"active":""} onClick={()=>setProtocol(p)} key={p||"ALL"}>{p||"ALL"}</button>)}</div></Field>
      <Field label="QUANTIDADE"><div className="segmented">{[1,5,10,20,50].map(n=><button disabled={loading} className={limit===String(n)?"active":""} onClick={()=>setLimit(String(n))} key={n}>{n}</button>)}</div></Field>
      <Field label="LATÊNCIA"><div className="segmented">{[["ALL","TODAS"],["GOOD","ATÉ 800 MS"],["EXCELLENT","ATÉ 300 MS"]].map(([v,l])=><button disabled={loading} className={quality===v?"active":""} onClick={()=>setQuality(v)} key={v}>{l}</button>)}</div></Field>
      <button className="button generate" onClick={generate} disabled={loading}>{loading?<><RefreshCw size={18} className="spin"/> TESTANDO... {elapsed}s</>:<>GERAR PROXYS <Zap size={18}/></>}</button>
    </div><p>O pedido leva até aproximadamente 50 segundos. Podemos entregar menos que o solicitado se não houver aprovadas suficientes. O filtro Brasil exige confirmação da localização de saída.</p>
      {loading&&<p role="status">Buscando candidatas e fazendo testes reais. Não feche esta página.</p>}
      {message&&<div className="results" role="status"><p>{message}</p></div>}
      {items.length>0&&<section className="named-export" aria-label="Exportar com nome Factor X">
        <h3>NOME FACTOR X NO SEU CLIENTE</h3>
        <p>Para clientes baseados em Mihomo (Clash Meta), importe o perfil abaixo. Cada proxy aparece com o nome <b>Factor X</b>, sem alterar IP, porta ou autenticação.</p>
        <div className="actions"><button className="button" disabled={!namedProfile.count} onClick={downloadNamed}>BAIXAR PERFIL FACTOR X</button><button className="button ghost" disabled={!namedProfile.count} onClick={()=>copy(namedProfile.text,"profile")}>{copied==="profile"?"PERFIL COPIADO":"COPIAR PERFIL MIHOMO"}</button></div>
        <p>{namedProfile.count} proxies compatíveis neste perfil. {namedProfile.omitted>0&&`${namedProfile.omitted} não incluídas: esta exportação aceita HTTP e SOCKS5, sem converter HTTPS ou SOCKS4.`}</p>
        <details><summary>Como usar e limitações</summary><p>Importe o arquivo factor-x-mihomo.yaml como um novo perfil em um cliente Mihomo e selecione a proxy no grupo Factor X. O arquivo usa JSON, uma representação válida de YAML. Ao ativar o perfil, o tráfego encaminhado ao cliente usará a proxy selecionada; preserve seu perfil anterior. Não ativamos nada automaticamente.</p><p>Nos demais clientes, use COPIAR ou COPIAR TODAS para obter somente os endereços. Não cole o perfil em campos IP:porta. O nome é um rótulo local: não é cookie, senha, rastreamento nem prova de propriedade das proxies públicas. A disponibilidade pode mudar após o teste.</p><p><a href="https://wiki.metacubex.one/en/config/proxies/http/" target="_blank" rel="noreferrer">Formato HTTP Mihomo</a> · <a href="https://wiki.metacubex.one/en/config/proxies/socks/" target="_blank" rel="noreferrer">Formato SOCKS5 Mihomo</a></p></details>
        {namedProfile.count>0&&<details><summary>Ver perfil com nomes</summary><pre>{namedProfile.text}</pre></details>}
        <span className="proxy-name-example">Exemplo de nome: {factorXName(items[0])}</span>
      </section>}
      {items.length>0&&<div className="results"><div className="results-head"><span>{items.length} APROVADAS NESTE PEDIDO <em>· FACTOR X</em></span><label><input type="checkbox" checked={withProtocol} onChange={e=>setWithProtocol(e.target.checked)}/> INCLUIR PROTOCOLO</label><button onClick={()=>copy(items.map(address).join("\n"),"all")}>{copied==="all"?<Check size={15}/>:<Copy size={15}/>} COPIAR TODAS</button></div>{items.map(p=><div className="proxy-row" key={p.id}><span className="flag">{p.countryCode||"--"}</span><code>{p.ip}:{p.port}</code><span>{p.protocol}</span><span>{p.latencyMs??"--"} MS</span><span className="online" title={`Testada em ${new Date(p.lastCheckedAt).toLocaleString("pt-BR")}`}><i/> {p.brVerified?"BR VERIFICADA":"TESTADA AGORA"}</span><button onClick={()=>copy(address(p),p.id)}>{copied===p.id?<Check size={15}/>:<Copy size={15}/>} {copied===p.id?"COPIADO":"COPIAR"}</button></div>)}</div>}
    </div></section>
    {copied&&<div className="copy-toast"><Check size={16}/><div><b>PROXY COPIADA</b><span>FACTOR X // PROXYS</span></div></div>}
    <section className="section network" id="network"><div className="section-tag">{"// PUBLIC NETWORK"}</div><h2>SEM ESTOQUE.<br/><span>TESTE NO SEU PEDIDO.</span></h2><p>As listas das fontes são reutilizadas por até 5 minutos em cada instância do servidor. Após esse prazo, o próximo pedido busca listas novas. Não há coleta contínua nem dependência de um computador ligado.</p><p>ProxyScrape, Relayglass, Proxifly e Monosans. Se uma fonte falhar, tentamos as demais. Uma lista recente não garante que suas proxies estejam funcionando: por isso testamos antes da entrega.</p></section>
    <section className="section how" id="how"><div className="section-tag">{"// ON-DEMAND PIPELINE"}</div><h2>VOCÊ GERA.<br/><span>A FACTORX FAZ O RESTO.</span></h2><div className="steps">{[["01","BUSCAMOS","Consultamos fontes públicas e removemos duplicatas."],["02","TESTAMOS","Cada candidata precisa passar por uma requisição real."],["03","ENTREGAMOS","Somente aprovadas, até a quantidade que você pediu."],["04","RENOVAMOS","Listas temporárias expiram. Novos pedidos fazem novos testes."]].map(([n,t,d])=><div className="step" key={n}><i>{n}</i><div className="step-icon">{n==="01"?<Globe2/>:n==="02"?<ShieldCheck/>:<RefreshCw/>}</div><h3>{t}</h3><p>{d}</p></div>)}</div></section>
    <footer><a className="brand" href="#top"><span>FACTOR</span><b>X</b></a><p>Proxies sob demanda</p><div><a href="/terms">Termos</a><a href="/privacy">Privacidade</a></div><small>Um teste aprovado não garante funcionamento futuro, anonimato ou acesso a qualquer site. Nunca envie senhas ou dados sensíveis por proxies públicas. Serviço sujeito aos limites gratuitos e à disponibilidade das fontes.</small></footer>
  </main>;
}
function Stat({value,label}:{value:string;label:string}){return <div><strong>{value}</strong><span>{label}</span></div>}
function Field({label,children}:{label:string;children:React.ReactNode}){return <div className="field"><label>{label}</label>{children}</div>}
