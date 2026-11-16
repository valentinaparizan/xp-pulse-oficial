# XP Pulse — nova jornada simplificada (2026)

A versão ativa do MVP está em src/PulseJourney.tsx. A versão anterior continua preservada em src/SimpleJourney.tsx.

## Jornada

1. **Começar**: abertura do XP Pulse.
2. **Empresa**: Petrobras, Itaú, Vale ou B3.
3. **Valor e prazo**: valor em reais e tempo aproximado (1, 3 ou 6 meses).
4. **Suas oportunidades**: datas e códigos de séries que constam do snapshot histórico da B3, com opção para **Subida** e **Queda** no mesmo vencimento. O sistema não mostra vencimentos passados nem combinações com uma só direção elegível.
5. **Sua previsão**: escolher **Subida** ou **Queda**. Código, preço histórico, preço de exercício e composição ficam em “Entender meu investimento”.
6. **Seu resultado**: gráfico interativo original, agora com a linha de resultado da opção isolada e uma segunda linha do produto fictício com piso de CDI.

## Escolha da quantidade

O número de unidades **não fica mais fixo em 100**. Para a série escolhida:

- Custo por bloco didático: preço histórico da opção × quantidade por bloco.
- Quantidade de blocos: parte inteira de (orçamento ÷ custo do bloco).
- Custo total: quantidade de blocos × custo do bloco.
- A diferença entre o orçamento informado e o custo total vai para a **parcela de renda fixa hipotética**.

As unidades do dataset são **didáticas** e não afirmam lote mínimo oficial, possibilidade de execução ou liquidez atual. A escolha automática privilegia o máximo aproveitamento do orçamento; **não é recomendação** de uma opção mais vantajosa em risco e retorno.

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
