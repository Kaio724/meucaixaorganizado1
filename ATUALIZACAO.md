# Atualização de categorias e previsões mensais

Esta versão mantém o cliente, o login, as variáveis de ambiente e o banco Supabase usados pelo sistema original. Não inclui banco SQLite, servidor de demonstração, credenciais locais ou dados de testes. Não requer migração nem modifica dados existentes durante a publicação.

## Alterações

- Categorias e subcategorias em dois níveis, com seleção da categoria antes da subcategoria.
- Categorias básicas mais enxutas; categorias históricas continuam nos lançamentos existentes.
- Separação das categorias pessoais e empresariais e inclusão das categorias criadas pelo usuário nos seletores.
- Receitas e despesas mensais podem ser previstas até uma data final na tela Contas a Pagar e a Receber. Cada parcela tem vencimento próprio, e as futuras permanecem pendentes até a baixa.
- Gravação da série em uma única chamada ao Supabase, propagando erros sem criar uma série local parcial.
- Ajustes de data local, agrupamento de categorias nos resumos e consistência dos valores realizados nos painéis.

## Compatibilidade

A categoria/subcategoria continua no campo `categoria` existente, como `Loja › Energia`. Os lançamentos recorrentes utilizam os campos de recorrência e baixa já previstos pelo código original. Categorias personalizadas continuam armazenadas no navegador, por usuário e conta, conforme o comportamento anterior; sincronizá-las entre dispositivos exige uma implementação separada.

Não há conversão automática dos lançamentos antigos sem recorrência. A autenticação Supabase, pagamentos, funções Netlify e configuração de publicação originais foram preservadas.

## Validação

- `TZ=America/Sao_Paulo node --import tsx --test tests/domain.test.ts tests/supabase.test.mjs`: 26 testes aprovados. No Windows, defina TZ no ambiente antes de executar.
- `npx tsc --noEmit -p tsconfig.app.json`: aprovado para a aplicação e configuração Vite.
- `npm run build`: compilação completa de frontend e servidor.
- O teste de Supabase usa o SDK real com transporte interceptado para domínio fictício, sem acessar o projeto de produção. Valida campos, parcelas, identificação do usuário e propagação de erro.
- O fluxo visual foi validado anteriormente na cópia local: novembro, dezembro, janeiro, término em fevereiro, recarga da página e baixa individual sem antecipar as demais parcelas.

O verificador TypeScript geral do repositório possui erros preexistentes nos arquivos de trial e webhook que não fazem parte desta atualização. O aviso de tamanho do pacote Vite também permanece.
