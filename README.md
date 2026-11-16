# XP Pulse — protótipo acadêmico de investimentos

Site: https://valentinaparizan.github.io/xp-pulse-oficial/

O XP Pulse é uma **simulação educacional**, desenvolvida com React, TypeScript e Vite. Não movimenta dinheiro, não oferece investimentos reais, não envia ordens e não constitui recomendação financeira.

## Nova experiência

- Abertura do XP Pulse e escolha entre **Petrobras, Itaú, Vale ou B3**.
- Valor que deseja simular e prazo aproximado de **1, 3 ou 6 meses**.
- Oportunidades com **séries reais de opções da base histórica B3**, apenas quando existem estratégias elegíveis de **Subida e Queda** para o vencimento.
- Escolha de **Subida** ou **Queda**, sem termos técnicos na interface principal.
- Simulação da **maior quantidade didática** que cabe no orçamento para a série escolhida; o saldo que não cobre outro bloco vai para renda fixa hipotética.
- **Gráfico interativo original mantido**, agora com comparação visual entre opção isolada e a regra fictícia de proteção.

**100% do CDI é uma premissa exclusivamente fictícia deste projeto acadêmico.** O simulador utiliza uma taxa ilustrativa de 1,2% ao mês, não uma cotação atual do CDI. Essa proteção **não está financiada, garantida nem validada como produto financeiro**. Na compra real de opções, o prêmio pode ser perdido integralmente.

## Dados e limitações

As séries foram negociadas no pregão de **02/10/2026**, conforme snapshot do COTAHIST da B3 (1.897 séries de PETR4, VALE3, ITUB4 e B3SA3). Não são cotações ao vivo nem ofertas executáveis. Vencimentos passados são filtrados na interface; a base precisa de atualização manual. Quantidades por bloco no protótipo são didáticas, não afirmação do lote negociável oficial. Custos, impostos, garantia real, liquidez e exercício não são implementados.

**[Veja o guia da nova jornada](docs/nova-jornada.md).** O [guia da versão anterior](docs/como-funciona.md) e seu componente (src/SimpleJourney.tsx) foram preservados para referência.

## Desenvolvimento

Requer Node.js 22.13 ou superior.

~~~sh
npm install
npm test
npm run build
npm run dev
~~~

O ponto de entrada é src/main.tsx e a jornada ativa é src/PulseJourney.tsx. A publicação no GitHub Pages acontece pela workflow .github/workflows/pages.yml em push na branch main.
