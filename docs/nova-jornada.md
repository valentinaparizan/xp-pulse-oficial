# XP Pulse — jornada ativa com recortes históricos (2024–2025)

A versão pública é implementada por `src/PulseJourney.tsx`; o arquivo `src/SimpleJourney.tsx` é legado e não é utilizado pelo site.

## Como funciona

1. O usuário escolhe uma empresa (Petrobras, Vale, Itaú ou B3).
2. Informa quanto deseja simular.
3. Seleciona um **período histórico encerrado** com preços de opção CALL e PUT disponíveis antes do vencimento.
4. Explora seis fatores econômicos qualitativos da empresa (três favoráveis à alta e três à queda), depois escolhe **Subida** ou **Queda**.
5. Só então a plataforma revela **preços históricos observados** da ação na entrada e no vencimento. Não existe sorteio, escolha de preço final nem mecanismo que faça a previsão do usuário se realizar.
6. A tabela apresenta o lucro/prejuízo intrínseco teórico da opção, juros simulados da sobra em renda fixa, e eventualmente um complemento hipotético, não financiado, ao piso acadêmico de CDI.
7. O gráfico em tela seguinte compara resultados teóricos de CALL/PUT em diferentes preços; o ponto histórico observado é fixo, não manipulável.

## Base e método

- `src/data/historic-replays.json`: cinco episódios históricos, incluindo Petrobras em outubro de 2024 e Petrobras, Vale, Itaú e B3 em outubro de 2025. Cada episódio traz datas, cotações observadas da ação, prêmio e strike da opção, volume financeiro do pregão, fonte pública e referência diária de CDI.
- `src/utils/historicalReplay.ts`: ignora recortes com vencimentos ainda futuros e só oferece episódio se CALL e PUT couberem no orçamento.
- O volume financeiro limita **conservadoramente** a quantidade didática de 100 unidades. Isso não prova que um investidor pudesse comprar aquela quantidade ao último prêmio.
- O resultado da opção é **valor intrínseco teórico ao preço de fechamento da ação no vencimento menos prêmio histórico**. Não é preço oficial de liquidação, retorno realmente realizado, oferta ou execução comprovada. Custos, impostos, proventos e possíveis ajustes não foram modelados.
- A renda fixa utiliza a sobra de caixa, com capitalização de uma **taxa diária histórica de referência constante** pelos dias úteis informados. É uma aproximação do CDI acumulado, não uma série diária integral reconstruída.
- O piso acadêmico de 100% CDI continua **sem financiamento nem garantia real**. Se o resultado das opções e renda fixa ficar abaixo do piso, a tabela separa o complemento hipotético necessário.

## Validação

Executar `npm test` e `npm run build`. A suíte testa resultados de alta e queda em 2024/2025, vários orçamentos, alocação do saldo, conciliação financeira, e consistência entre a direção escolhida e movimento histórico da ação.

**Importante:** são exemplos históricos **curados**, não uma estratégia preditiva nem um backtest completo. O fato de um cenário passado gerar lucro não implica que uma previsão futura acertará.
