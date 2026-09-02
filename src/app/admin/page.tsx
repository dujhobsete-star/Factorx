import Link from "next/link";
export default function Admin() {
  return <main className="admin-shell"><div className="brand"><span>FACTOR</span><b>X</b><i>{"// SOB DEMANDA"}</i></div><h1>TESTES NO MOMENTO DO PEDIDO</h1><p>O estoque e a manutenção contínua foram desativados no fluxo público. Os registros antigos foram preservados, mas não são usados para entregar proxies.</p><p>Para testar o sistema, escolha a quantidade no gerador. Cada solicitação busca candidatas e retorna somente as aprovadas naquele momento.</p><Link className="button" href="/#generator">ABRIR GERADOR</Link></main>;
}
