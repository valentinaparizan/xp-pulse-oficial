import { ArrowDownRight, ArrowUpRight, ChevronDown } from 'lucide-react';
import type { Factor, Stock } from '../types/market';

function FactorColumn({ title, tone, factors }: { title: string; tone: 'up' | 'down'; factors: Factor[] }) {
  const DirectionIcon = tone === 'up' ? ArrowUpRight : ArrowDownRight;
  return <div className="pulse-factors-column">
    <h3><DirectionIcon size={21} aria-hidden="true"/> {title}</h3>
    <div className="pulse-factors-list">
      {factors.map(factor => <details className="pulse-factor" key={factor.title}>
        <summary>
          <span className="pulse-factor-emoji" aria-hidden="true">{factor.icon}</span>
          <span className="pulse-factor-main">
            <strong>{factor.title}</strong>
            <span>{factor.short}</span>
          </span>
          <ChevronDown className="pulse-factor-chevron" size={18} aria-hidden="true"/>
        </summary>
        <div className="pulse-factor-expanded">
          <p>{factor.detail}</p>
          <p className="pulse-factor-context">O mercado pode já ter antecipado essa informação, e outros fatores podem compensar seu efeito. Uma notícia positiva não garante alta, nem uma negativa garante queda.</p>
        </div>
      </details>)}
    </div>
  </div>;
}

/** Reuses the company-specific educational analysis already authored in stocks.json. */
export function StockFactorsExplorer({ stock }: { stock: Stock }) {
  return <section className="pulse-factors-explorer" aria-label={'Fatores que podem influenciar as ações de ' + stock.name}>
    <h2>Explore o que pode influenciar o preço</h2>
    <p>Antes de decidir, veja situações que podem afetar as ações de {stock.name}. Toque nos fatores para entender melhor.</p>
    <div className="pulse-factors-columns">
      <FactorColumn title="Pode subir se…" tone="up" factors={stock.bull}/>
      <FactorColumn title="Pode cair se…" tone="down" factors={stock.bear}/>
    </div>
    <p className="pulse-factor-disclaimer">São explicações econômicas educativas, não notícias atuais nem previsões. Explorar os fatores não altera automaticamente o preço final: você decide a direção e escolhe o cenário na próxima etapa.</p>
  </section>;
}
