# XP Pulse Oficial

Protótipo educacional de opções desenvolvido com React, TypeScript e Vite. Não envia ordens, não utiliza dinheiro real e não constitui recomendação de investimento.

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
