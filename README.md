# XP Pulse Oficial

Protótipo educacional de opções desenvolvido com React, TypeScript e Vite. Não envia ordens, não utiliza dinheiro real e não constitui recomendação de investimento.

## Como funciona

Leia o [guia didático do XP Pulse](docs/como-funciona.md), com as seis etapas, um exemplo de cálculo e as limitações do MVP.

## Executar localmente

Requer Node.js 22.13 ou superior.

```sh
npm install
npm run dev
```

Abra o endereço informado no terminal. O servidor precisa continuar ativo durante o uso local.

## Verificação e build

```sh
npm test
npm run build
npm run preview
```

A pasta `dist/` gerada contém o site estático. Os caminhos relativos permitem hospedá-lo em uma subpasta, incluindo GitHub Pages.

## Funcionalidades

- Escolha de empresa, direção, vencimento e orçamento.
- Ensino progressivo de CALL, PUT, strike, prêmio e ponto de equilíbrio.
- Simulação de resultado no vencimento, salvamento de teses e replay educacional.
- Progresso e teses salvos somente no navegador (localStorage).

## Dados e limites

Os arquivos `src/data/` incluem fontes e datas dos snapshots. As cotações não são atualizadas em tempo real. Valores ilustrativos são identificados no aplicativo. Quantidades didáticas não devem ser confundidas com lotes oficiais; especificações não confirmadas são sinalizadas. A simulação simplifica o resultado no vencimento e não representa custos, liquidez, execução ou resultado garantido.

## Estrutura

- `src/App.tsx`: jornada e telas.
- `src/data/`: snapshots e dados didáticos.
- `src/utils/`: cálculos, filtros e testes.
- `components/ui/`: componentes de interface.
- `app/globals.css`: estilos.

Sem backend, autenticação ou integrações de negociação.

## Séries B3 e comparação de cenários

A jornada ativa está em `src/SimpleJourney.tsx`. Na confirmação é possível selecionar uma das séries que cabem no orçamento, pesquisar pelo código e ordenar por strike, custo ou negócios. A posição continua fixa em 100 unidades didáticas (não afirma lote oficial). No resultado, “E se…?” abre o gráfico de payoff, troca de prazo e comparação de séries no mesmo preço final hipotético.

A base desta versão tem 1.897 opções de PETR4, VALE3, ITUB4 e B3SA3, negociadas em 02/10/2026. É um snapshot, não feed ao vivo, e não inclui séries autorizadas sem negócio naquele pregão. Último negócio não é oferta executável; número de negócios não garante liquidez atual. As ações usam o mesmo pregão. Prêmios e preços podem ter horários diferentes.

### Atualizar a base

Baixe e descompacte o [COTAHIST diário oficial](https://bvmf.bmfbovespa.com.br/InstDados/SerHist/COTAHIST_D02102026.ZIP). Com Node 22.13 ou superior, na raiz do projeto:

```sh
node --experimental-strip-types scripts/import-b3.ts COTAHIST_D02102026.TXT 2026-10-05 https://bvmf.bmfbovespa.com.br/InstDados/SerHist/COTAHIST_D02102026.ZIP
npm test
npm run build
```

Substitua arquivo, data de referência e URL pela nova fonte oficial. Revise os três arquivos gerados em `src/data/` antes de publicar. A atualização não é automática. O metadata registra origem, data, exclusões e SHA-256 do TXT. Não publique arquivos brutos ou dependências.

O importador segue o [layout B3](https://b3.com.br/data/files/C8/F3/08/B4/297BE410F816C9E492D828A8/SeriesHistoricas_Layout.pdf), mercados 010/070/080, e associa opção ao ativo pelo ISIN e classe ON/PN, nunca só pelo prefixo do ticker. Exclui vencimentos até a referência, prêmios sem negócio, fatores de cotação diferentes de 1 e strikes com correção. Valida contagem, campos, data e duplicatas antes de gerar a base. Estilo de exercício não é inferido.

### Como interpretar os números

Resultado no vencimento = valor intrínseco × quantidade − prêmio pago. Múltiplo = esse resultado / prêmio total; não mede probabilidade. Prêmio de R$ 0,30 com lucro líquido de R$ 0,90 dá 3× (300%); valor bruto de R$ 0,90 dá lucro de R$ 0,60, ou 2×. CALL comprada não tem teto teórico de lucro; PUT comprada tem máximo com ação a zero. Perda máxima é o prêmio. Não inclui taxas, tributos, exercício efetivo ou venda antecipada.
