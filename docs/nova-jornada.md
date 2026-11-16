# XP Pulse — nova jornada simplificada (2026)

A versão ativa do MVP está em src/PulseJourney.tsx. A versão anterior continua preservada em src/SimpleJourney.tsx.

## Jornada

1. **Começar**: abertura do XP Pulse.
2. **Empresa**: Petrobras, Itaú, Vale ou B3.
3. **Valor e prazo**: valor em reais e tempo aproximado (1, 3 ou 6 meses).
4. **Suas oportunidades**: datas e códigos de séries que constam do snapshot histórico da B3, com opção para **Subida** e **Queda** no mesmo vencimento. O sistema não mostra vencimentos passados nem combinações com uma só direção elegível.
5. **Sua previsão e fatores**: explorar os três fatores que podem favorecer a alta e os três que podem pressionar a queda da empresa escolhida (abrindo os detalhes), então escolher **Subida** ou **Queda**. O usuário **não escolhe o preço final nem o lucro**. Código, preço histórico, preço de exercício e composição ficam em “Entender meu investimento”.
6. **Seu resultado**: o sistema gera automaticamente um preço hipotético por um sorteio lognormal independente da direção escolhida; compara a previsão com o movimento simulado, sem afirmar que o futuro é conhecido. A tabela diferencia resultado líquido da opção, juros da renda fixa e eventual complemento do piso fictício.
7. **Gráfico**: tela separada com as curvas de resultado da opção e do produto fictício para diferentes preços, destacando o cenário gerado. A página não permite alterar o resultado sorteado.

## Escolha da quantidade

O número de unidades **não fica mais fixo em 100**. Para a série escolhida:

- Custo por bloco didático: preço histórico da opção × quantidade por bloco.
- Quantidade de blocos: parte inteira de (orçamento ÷ custo do bloco).
- Custo total: quantidade de blocos × custo do bloco.
- A diferença entre o orçamento informado e o custo total vai para a **parcela de renda fixa hipotética**.

As unidades do dataset são **didáticas** e não afirmam lote mínimo oficial, possibilidade de execução ou liquidez atual. A escolha automática prioriza as opções acessíveis com preço de equilíbrio mais próximo do preço histórico da ação; dentro da série escolhida, usa a quantidade máxima possível, destinando a sobra à renda fixa hipotética. Isso **não é recomendação**, previsão de lucro ou medida de probabilidade de sucesso.

## Cenário de mercado independente da previsão

O fechamento futuro de um contrato com vencimento ainda não ocorrido é desconhecido. Por isso a interface não permite que o usuário escolha seu preço final ou seu lucro. Ao simular, sorteia um possível preço usando modelo lognormal de expectativa sem tendência e **volatilidade anual hipotética de 35%** (parâmetro didático, não estimado historicamente). O sorteio não recebe a direção escolhida como entrada, então pode haver acerto, erro, lucro ou prejuízo. A metodologia não constitui previsão nem cotação futura.

Os fatores específicos da empresa são explicações qualitativas de risco e não alimentam matematicamente o sorteio. O gráfico visualiza a sensibilidade dos resultados, sem mudar o cenário sorteado. Para calcular o CDI e a dispersão do preço, o prazo considerado pela jornada é o número de dias que resta até o vencimento, medido na data da simulação; **os preços da B3 permanecem um snapshot antigo (02/10/2026) e não representam transações disponíveis hoje**. É um protótipo educacional, não backtest nem produto executável.

## Regra **fictícia** de proteção

O projeto acadêmico define um piso de **100% de um CDI hipotético** ao longo do prazo de simulação. Para fins de ilustração, usa-se 1,2% ao mês como taxa de referência, **não** a taxa CDI corrente.

- Rendimento de referência do período = (1 + 0,012) elevado a (dias / 30), menos 1.
- Valor sem proteção = valor da opção no vencimento + saldo da renda fixa hipotética.
- Piso do produto fictício = valor inicial × (1 + rendimento de referência).
- Total mostrado = **maior** entre valor sem proteção e piso do produto fictício.

Não basta acertar a direção da ação: a movimentação precisa ser suficiente para gerar valor após o custo da opção. Se o total não superar o piso, o simulador apresenta o piso fictício.

**Crítico:** a proteção não tem financiamento, contraparte ou engenharia financeira implementados. Ela não constitui garantia real e não é uma promessa de 100% do CDI. Não é produto lançado, autorizado ou oferecido para investimento. Não há depósito, compra nem ordens executadas.

## Dados reais, mas históricos

A base de src/data/ tem 1.897 séries com último negócio em **02/10/2026**, importadas de arquivo oficial COTAHIST da B3. Os códigos e preços de referência das opções não são inventados, mas **não estão atualizados em tempo real**. Uma série presente na base não necessariamente tem oferta ou possibilidade de execução hoje. A atualização da base continua manual.

## Exemplo puramente didático

Com orçamento de R$ 100, suponha um bloco de opções que custa R$ 30. O sistema aloca R$ 90 em três blocos e R$ 10 para a renda fixa hipotética. Em aproximadamente três meses, com o CDI ilustrativo de 1,2% ao mês, o piso seria cerca de R$ 103,64.

Se a opção não gerar valor suficiente, o resultado mostrado será o piso fictício. Se o valor bruto das opções no vencimento fosse R$ 130, somado à parcela da renda fixa, o total hipotético seria aproximadamente R$ 140,36. Valores inventados apenas para explicar a fórmula, não contratos concretos.

## Testes e publicação

Execute npm test e npm run build. O site usa src/main.tsx, que aponta para src/PulseJourney.tsx. GitHub Pages é publicado a partir da branch main pela workflow pages.yml.
