# XP Pulse
## Aprenda a explorar cenários antes de investir

O XP Pulse é um simulador educacional que ajuda você a entender como uma ideia sobre uma empresa pode se transformar em um resultado financeiro. Você escolhe uma empresa, define um valor fictício, indica se acredita em alta ou queda e explora diferentes cenários.

**Nesta versão, não há depósito, compra, venda ou dinheiro retido. Todos os resultados são simulações.**

## O que você aprende

- Como valor, prazo e preço final influenciam uma estratégia.
- Por que acertar a direção da ação nem sempre é suficiente para ter lucro.
- Como comparar opções da mesma empresa.
- Quanto uma posição poderia ganhar ou perder no vencimento.

## Como funciona: seis passos

### 1. Escolha uma empresa

Escolha Petrobras (PETR4), Vale (VALE3), Itaú Unibanco (ITUB4) ou B3 (B3SA3). O nome identifica a empresa; o código identifica a ação usada na simulação. A lista serve para explorar possibilidades, não indica qual empresa comprar.

### 2. Defina o valor e a data

Informe o valor fictício que deseja usar como limite. Depois, escolha a data em que o cenário será avaliado.

O sistema verifica quais opções da base cabem nesse limite. Se uma combinação estiver indisponível, você pode ajustar o valor ou a data. Isso é uma limitação desta simulação e de sua base, não uma proibição do mercado.

**Exemplo:** uma opção custa R$ 0,30 por unidade. O protótipo usa 100 unidades didáticas. O custo simulado será R$ 30,00. Com limite de R$ 50,00, ficam R$ 20,00 sem uso, fora da conta do resultado.

A quantidade permanece fixa em 100 unidades didáticas. Aumentar o limite não aumenta automaticamente a posição: pode liberar outra opção ou apenas aumentar a sobra. Essa quantidade não é apresentada como lote mínimo oficial.

### 3. Escolha sua visão: alta ou queda

Você pode escolher “Acho que sobe” ou “Acho que cai”. A plataforma apresenta fatores econômicos que ajudam a pensar sobre a empresa, como demanda, custos e preços de matérias-primas.

Esses fatores são explicações ilustrativas. Não são notícias atualizadas, previsões ou probabilidades. Na lógica interna, a visão de alta corresponde à compra de uma CALL e a de queda à compra de uma PUT.

### 4. Registre seu motivo

Selecione o fator que explica sua escolha. Por exemplo: acreditar em queda porque um preço menor do minério poderia pressionar a receita da Vale.

A justificativa ajuda você a refletir. Ela não muda o cálculo nem faz o sistema prever o movimento da ação.

### 5. Compare e confirme

Antes de simular, confira empresa, direção, data, valor utilizado e sobra. Você também pode trocar a opção dentro da mesma empresa, direção e data.

A lista permite pesquisar códigos e ordenar as opções. Compare o custo, o preço de referência e o preço a partir do qual haveria lucro no vencimento. A seleção inicial segue um critério do simulador; não é recomendação de investimento.

### 6. Explore o resultado

O primeiro cenário mantém o preço da ação igual ao preço de referência histórico. Ele é uma hipótese neutra, não uma previsão nem o resultado real de uma operação.

Se o resultado for negativo, aparece “Não foi dessa vez”, acompanhado do valor com sinal de menos e da explicação. A mensagem acolhe o usuário; a perda simulada continua visível.

Abra **“Explore outro cenário e veja o que muda.”** para testar alta, estabilidade ou queda e movimentar o preço no gráfico. Ao trocar a data, outra opção pode ser selecionada: preço de referência e custo também podem mudar.

## Entenda a conta com um exemplo

Imagine uma opção de alta com preço de referência de R$ 50,00 e custo de R$ 0,30 por unidade. Para 100 unidades, você usa R$ 30,00. Todos os valores abaixo são ilustrativos e calculados no vencimento, antes de taxas e tributos.

| Preço final da ação | Valor da opção no vencimento | Custo inicial | Resultado simulado |
|---|---:|---:|---:|
| R$ 49,00 | R$ 0,00 | R$ 30,00 | −R$ 30,00 |
| R$ 50,20 | R$ 20,00 | R$ 30,00 | −R$ 10,00 |
| R$ 50,30 | R$ 30,00 | R$ 30,00 | R$ 0,00 |
| R$ 51,20 | R$ 120,00 | R$ 30,00 | +R$ 90,00 |

Na segunda linha, o preço supera R$ 50,00, mas o ganho ainda não cobre o custo. Na última linha, o resultado líquido é R$ 90,00: três vezes os R$ 30,00 usados. Isso significa **3× de lucro sobre o prêmio**, não 3× de chance de ganhar.

Para uma opção de queda, a lógica se inverte: o direito ganha valor quando a ação termina abaixo do preço de referência. O custo também precisa ser descontado.

## Pequeno dicionário

- **Prêmio:** preço pago pelo direito representado pela opção. Não é uma recompensa.
- **Preço de referência (strike):** preço definido no contrato, usado para calcular seu valor no vencimento.
- **Vencimento:** data em que o cenário da opção é avaliado nesta simulação.
- **Ponto de equilíbrio:** preço final em que o valor da opção recupera o custo, antes de despesas.
- **CALL:** direito de compra; na compra isolada simulada, uma alta suficiente pode gerar lucro.
- **PUT:** direito de venda; na compra isolada simulada, uma queda suficiente pode gerar lucro.
- **Gráfico de resultado:** relaciona o preço final hipotético da ação ao ganho ou à perda da posição.

## De onde vêm os dados?

Esta entrega contém 1.897 séries de opções das quatro ações, com último negócio no pregão de **02/10/2026**, conforme os arquivos da base e seus metadados. A fonte registrada é o COTAHIST da B3.

É uma fotografia histórica. Não é cotação ao vivo e não inclui necessariamente todas as séries autorizadas. O último negócio não garante que seja possível comprar ou vender pelo mesmo preço hoje. A atualização é manual.

## O que o MVP faz e o que ainda não faz

O MVP permite comparar opções, testar preços finais e entender resultados no vencimento. O rascunho da jornada é salvo no próprio navegador, quando o armazenamento está disponível.

Ele não prevê preços, calcula probabilidades de sucesso, executa ordens ou recebe depósitos. Também não calcula venda antecipada, taxas, tributos ou condições reais de execução. Não oferece proteção do capital: na compra de opção simulada, é possível perder todo o prêmio utilizado.

Diário de aprendizado, recompensas por compreensão, verificação de conhecimento e integração com operações reais são possibilidades futuras; não estão implementados nesta entrega.

## Como apresentar em uma demonstração

1. Escolha uma empresa e um limite fictício que permita continuar.
2. Selecione alta ou queda e registre um motivo.
3. Mostre que existem opções diferentes para a mesma ideia.
4. Confirme e explique o resultado inicial.
5. Abra a exploração de cenários e compare estabilidade, alta e queda.
6. Termine perguntando: “O que mudou no resultado e por quê?”

O objetivo da demonstração é mostrar que o usuário consegue explicar sua escolha e seu risco, além de observar um número na tela.

## Identidade e uso

XP Pulse é o nome deste protótipo. Este material não afirma vínculo oficial com a XP nem aprovação pela CVM. O aplicativo é uma ferramenta de aprendizagem, não uma recomendação personalizada.
