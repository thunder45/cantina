# Requirements Document

## Introduction

Este documento especifica os requisitos para uma aplicação de Ponto de Venda (POS) para cantinas. O sistema permite a gestão de menus por evento/dia, processamento de vendas, controle de estoque e gestão de pagamentos (incluindo pagamentos anotados para clientes). O backend será hospedado na AWS e o frontend suportará Android Tablet (principal), Browser (PC/MacOS), iOS e Android Mobile.

## Glossary

- **Sistema POS**: Sistema de Ponto de Venda da Cantina
- **Categoria de Evento**: Classificação obrigatória que agrupa eventos por tipo (ex: Culto, Kids, Casais), usada para organização e relatórios
- **Evento**: Período de vendas que pertence a uma categoria, podendo compreender um ou mais dias (sequenciais ou não)
- **Menu**: Conjunto de itens disponíveis para venda em um evento/dia, organizado em grupos
- **Grupo de Menu**: Categoria de itens (ex: Refeição, Bebida, Sobremesa)
- **Item de Menu**: Produto disponível para venda com descrição, preço e quantidade em estoque
- **Catálogo**: Lista predefinida de itens disponíveis para seleção ao montar um menu
- **Pedido**: Seleção de itens feita pelo cliente antes do pagamento
- **Venda**: Transação confirmada com itens, valores e forma de pagamento registrados
- **Cliente Anotado**: Cliente que opta por pagar posteriormente, com histórico de compras e pagamentos
- **Pagamento Parcial**: Pagamento de parte do valor pendente de um cliente anotado
- **Pagamento Misto**: Pagamento utilizando múltiplos meios simultaneamente
- **Estorno**: Reversão de uma venda confirmada, devolvendo itens ao estoque
- **Recibo**: Comprovante de venda com detalhes da transação
- **Soft Delete**: Exclusão lógica que mantém o registro para histórico mas o marca como inativo

## Requirements

### Requirement 1: Gestão de Categorias de Eventos

**User Story:** Como caixa, quero gerenciar categorias de eventos, para que eu possa organizar os eventos por tipo e gerar relatórios agrupados.

#### Acceptance Criteria

1. WHEN o Sistema POS é inicializado pela primeira vez THEN o Sistema POS SHALL criar três categorias padrão: Culto, Kids e Casais
2. WHEN o caixa acessa a lista de categorias THEN o Sistema POS SHALL exibir todas as categorias com a quantidade de eventos associados
3. WHEN o caixa cria uma nova categoria THEN o Sistema POS SHALL solicitar nome e armazenar a categoria para uso em eventos
4. WHEN o caixa edita uma categoria existente THEN o Sistema POS SHALL atualizar o nome sem afetar eventos já criados
5. IF o caixa tenta remover uma categoria com eventos associados THEN o Sistema POS SHALL exibir mensagem de erro e manter a categoria
6. WHEN o caixa remove uma categoria sem eventos associados THEN o Sistema POS SHALL remover a categoria da lista

### Requirement 2: Gestão de Eventos

**User Story:** Como caixa, quero criar e gerenciar eventos de venda dentro de categorias, para que eu possa organizar as vendas por período.

#### Acceptance Criteria

1. WHEN o caixa seleciona uma categoria THEN o Sistema POS SHALL exibir todos os eventos dessa categoria com seus respectivos status (ativo, encerrado)
2. WHEN o caixa cria um novo evento THEN o Sistema POS SHALL solicitar categoria (obrigatória), nome e datas (uma ou mais)
3. WHEN o caixa seleciona datas para um evento THEN o Sistema POS SHALL permitir a seleção de múltiplos dias não sequenciais
4. WHEN o caixa cria evento a partir de uma categoria THEN o Sistema POS SHALL pré-selecionar essa categoria no formulário
5. WHEN o caixa acessa a lista geral de eventos THEN o Sistema POS SHALL exibir todos os eventos agrupados por categoria

### Requirement 3: Gestão de Grupos de Menu

**User Story:** Como caixa, quero gerenciar os grupos do menu (Refeição, Bebida, Sobremesa), para que eu possa organizar os itens de forma flexível.

#### Acceptance Criteria

1. WHEN o Sistema POS é inicializado pela primeira vez THEN o Sistema POS SHALL criar três grupos padrão: Refeição, Bebida e Sobremesa
2. WHEN o caixa adiciona um novo grupo THEN o Sistema POS SHALL criar o grupo e disponibilizá-lo para seleção de itens
3. WHEN o caixa remove um grupo sem itens associados ao evento atual THEN o Sistema POS SHALL remover o grupo da lista de grupos ativos
4. IF o caixa tenta remover um grupo com itens associados ao evento atual THEN o Sistema POS SHALL exibir mensagem de erro e manter o grupo

### Requirement 4: Gestão do Catálogo de Itens

**User Story:** Como caixa, quero manter um catálogo de itens predefinidos, para que eu possa reutilizá-los em diferentes eventos sem recriá-los.

#### Acceptance Criteria

1. WHEN o caixa cria um novo item no catálogo THEN o Sistema POS SHALL armazenar descrição, preço sugerido e grupo associado
2. WHEN o caixa edita um item existente no catálogo THEN o Sistema POS SHALL atualizar os dados sem afetar menus já criados
3. WHEN o caixa pesquisa itens no catálogo THEN o Sistema POS SHALL filtrar por descrição ou grupo
4. WHEN o caixa visualiza o catálogo THEN o Sistema POS SHALL exibir todos os itens ordenados por grupo e descrição
5. WHEN o caixa exclui um item do catálogo THEN o Sistema POS SHALL realizar soft delete mantendo histórico de uso
6. WHEN o caixa remove um item do menu de um evento THEN o Sistema POS SHALL remover apenas do evento atual sem afetar o catálogo

### Requirement 5: Definição do Menu do Dia/Evento

**User Story:** Como caixa, quero definir o menu disponível para cada dia/evento, para que eu possa controlar o que está à venda e o estoque disponível.

#### Acceptance Criteria

1. WHEN o caixa monta o menu do dia THEN o Sistema POS SHALL permitir selecionar itens do catálogo predefinido
2. WHEN o caixa adiciona um item ao menu do dia THEN o Sistema POS SHALL solicitar preço (com valor sugerido do catálogo) e quantidade em estoque
3. WHEN o caixa define quantidade em estoque como zero THEN o Sistema POS SHALL tratar o item como tendo estoque infinito
4. WHEN o caixa cria um novo item durante a montagem do menu THEN o Sistema POS SHALL adicionar o item ao catálogo para uso futuro
5. WHEN o caixa finaliza a definição do menu THEN o Sistema POS SHALL habilitar o modo de vendas

### Requirement 6: Modo de Vendas - Montagem do Pedido

**User Story:** Como caixa, quero montar pedidos de forma rápida e intuitiva, para que eu possa atender os clientes com eficiência.

#### Acceptance Criteria

1. WHEN o caixa acessa o modo de vendas THEN o Sistema POS SHALL exibir os itens do menu organizados por grupo
2. WHEN o caixa seleciona um item THEN o Sistema POS SHALL adicionar o item ao pedido atual e atualizar o total
3. WHEN o caixa ajusta a quantidade de um item no pedido THEN o Sistema POS SHALL recalcular o total automaticamente
4. WHEN o caixa remove um item do pedido THEN o Sistema POS SHALL atualizar o total e liberar a quantidade reservada
5. WHILE um pedido está em montagem THEN o Sistema POS SHALL exibir o resumo com itens, quantidades e valor total

### Requirement 7: Controle de Estoque

**User Story:** Como caixa, quero que o sistema controle automaticamente o estoque, para que eu não venda mais do que tenho disponível.

#### Acceptance Criteria

1. WHEN uma venda é confirmada THEN o Sistema POS SHALL decrementar a quantidade vendida do estoque de cada item
2. WHEN um item atinge estoque zero (não infinito) THEN o Sistema POS SHALL marcar o item como indisponível no menu
3. WHILE o caixa monta um pedido THEN o Sistema POS SHALL exibir a quantidade disponível de cada item
4. IF o caixa tenta adicionar quantidade maior que o estoque disponível THEN o Sistema POS SHALL limitar a quantidade ao estoque disponível e exibir aviso

### Requirement 8: Processamento de Pagamento Imediato

**User Story:** Como caixa, quero processar pagamentos de diferentes formas, para que eu possa atender às preferências dos clientes.

#### Acceptance Criteria

1. WHEN o caixa finaliza um pedido THEN o Sistema POS SHALL exibir opções de pagamento: dinheiro, cartão, transferência ou anotar
2. WHEN o caixa seleciona pagamento em dinheiro, cartão ou transferência THEN o Sistema POS SHALL registrar o tipo de pagamento e confirmar a venda
3. WHEN o caixa opta por pagamento misto THEN o Sistema POS SHALL permitir dividir o valor entre múltiplos meios de pagamento
4. WHEN uma venda é confirmada THEN o Sistema POS SHALL gerar um registro com itens, valores, total, forma(s) de pagamento e timestamp

### Requirement 9: Pagamento Anotado (Fiado)

**User Story:** Como caixa, quero anotar vendas para clientes pagarem depois, para que eu possa oferecer crédito a clientes conhecidos.

#### Acceptance Criteria

1. WHEN o caixa seleciona "anotar" como forma de pagamento THEN o Sistema POS SHALL solicitar a seleção ou criação de um cliente
2. WHEN o caixa pesquisa um cliente existente THEN o Sistema POS SHALL filtrar clientes por nome
3. WHEN o caixa cria um novo cliente THEN o Sistema POS SHALL solicitar nome e armazenar no cadastro
4. WHEN uma venda anotada é confirmada THEN o Sistema POS SHALL vincular a venda ao cliente e registrar como pendente de pagamento

### Requirement 10: Gestão de Pagamentos Pendentes

**User Story:** Como caixa, quero gerenciar os pagamentos pendentes dos clientes, para que eu possa cobrar valores devidos e registrar pagamentos parciais.

#### Acceptance Criteria

1. WHEN o caixa acessa a função de pagamentos pendentes THEN o Sistema POS SHALL exibir interface de pesquisa de clientes
2. WHEN o caixa seleciona um cliente THEN o Sistema POS SHALL exibir histórico completo de compras e pagamentos
3. WHEN o caixa visualiza um cliente THEN o Sistema POS SHALL calcular e exibir o valor total pendente
4. WHEN o caixa registra um pagamento THEN o Sistema POS SHALL permitir valor parcial ou total do débito pendente
5. WHEN o caixa registra um pagamento THEN o Sistema POS SHALL solicitar o meio de pagamento (dinheiro, cartão, transferência ou misto)
6. WHEN um pagamento é registrado THEN o Sistema POS SHALL atualizar o histórico do cliente com valor, data e meio de pagamento

### Requirement 11: Relatórios de Vendas

**User Story:** Como caixa, quero gerar relatórios de vendas por evento e categoria, para que eu possa analisar o desempenho das vendas.

#### Acceptance Criteria

1. WHEN o caixa solicita relatório de um evento THEN o Sistema POS SHALL exibir total de vendas, itens vendidos e formas de pagamento
2. WHEN o caixa solicita relatório de uma categoria THEN o Sistema POS SHALL agregar dados de todos os eventos dessa categoria
3. WHEN o caixa visualiza relatório THEN o Sistema POS SHALL exibir valores pendentes de pagamento separadamente
4. WHEN o caixa filtra relatório por período THEN o Sistema POS SHALL exibir vendas entre data início e data fim
5. WHEN o caixa solicita relatório de estoque THEN o Sistema POS SHALL exibir quantidade vendida, disponível e sobras por item
6. WHEN o caixa exporta relatório THEN o Sistema POS SHALL gerar arquivo CSV com todos os dados do relatório

### Requirement 12: Persistência e Sincronização

**User Story:** Como caixa, quero que meus dados sejam salvos na nuvem, para que eu possa acessá-los de diferentes dispositivos.

#### Acceptance Criteria

1. WHEN o caixa realiza qualquer operação de escrita THEN o Sistema POS SHALL persistir os dados no backend AWS
2. WHEN o caixa acessa o sistema de um novo dispositivo THEN o Sistema POS SHALL sincronizar todos os dados do backend
3. IF a conexão com o backend falha durante uma operação THEN o Sistema POS SHALL armazenar localmente e sincronizar quando a conexão for restabelecida

### Requirement 13: Interface Multi-Plataforma

**User Story:** Como caixa, quero usar o sistema em diferentes dispositivos, para que eu tenha flexibilidade no ponto de venda.

#### Acceptance Criteria

1. WHEN o caixa acessa o sistema via Android Tablet THEN o Sistema POS SHALL exibir interface otimizada para toque em tela grande
2. WHEN o caixa acessa o sistema via Browser (PC/MacOS) THEN o Sistema POS SHALL exibir interface responsiva para desktop
3. WHEN o caixa acessa o sistema via dispositivo móvel (iOS/Android) THEN o Sistema POS SHALL exibir interface adaptada para telas menores

### Requirement 14: Cancelamento de Pedidos

**User Story:** Como caixa, quero cancelar pedidos antes de confirmar, para que eu possa corrigir erros ou atender mudanças do cliente.

#### Acceptance Criteria

1. WHEN o caixa cancela um pedido pendente THEN o Sistema POS SHALL liberar itens reservados de volta ao estoque disponível
2. WHEN o caixa cancela um pedido THEN o Sistema POS SHALL marcar o pedido como cancelado e impedir recuperação
3. WHEN o caixa limpa o pedido atual THEN o Sistema POS SHALL remover todos os itens e zerar o total

### Requirement 15: Estorno de Vendas

**User Story:** Como caixa, quero estornar vendas confirmadas, para que eu possa lidar com devoluções ou erros.

#### Acceptance Criteria

1. WHEN o caixa estorna uma venda paga THEN o Sistema POS SHALL incrementar o estoque com os itens devolvidos
2. WHEN o caixa estorna uma venda a crédito THEN o Sistema POS SHALL remover o débito do saldo do cliente
3. WHEN o caixa estorna uma venda THEN o Sistema POS SHALL criar registro de estorno com motivo, timestamp e usuário
4. WHEN o caixa visualiza vendas THEN o Sistema POS SHALL distinguir vendas normais de vendas estornadas

### Requirement 16: Validações de Entrada

**User Story:** Como caixa, quero que o sistema valide minhas entradas, para que eu evite erros de cadastro.

#### Acceptance Criteria

1. IF o caixa tenta criar item com preço menor ou igual a zero THEN o Sistema POS SHALL rejeitar e exibir mensagem de erro
2. IF o caixa tenta criar evento, categoria ou cliente com nome vazio THEN o Sistema POS SHALL rejeitar e exibir mensagem de erro
3. IF o caixa tenta adicionar quantidade negativa ao pedido THEN o Sistema POS SHALL rejeitar e manter quantidade anterior
4. WHEN o caixa insere valores monetários THEN o Sistema POS SHALL formatar com duas casas decimais em Euro (€)

### Requirement 17: Recibos e Comprovantes

**User Story:** Como caixa, quero gerar recibos das vendas, para que o cliente tenha comprovante da compra.

#### Acceptance Criteria

1. WHEN uma venda é confirmada THEN o Sistema POS SHALL gerar recibo com itens, quantidades, preços, total, forma de pagamento e timestamp
2. WHEN o caixa solicita reimpressão THEN o Sistema POS SHALL recuperar e exibir recibo de venda anterior
3. WHEN o caixa visualiza histórico de vendas THEN o Sistema POS SHALL permitir acesso ao recibo de cada venda

### Requirement 18: Auditoria

**User Story:** Como gerente, quero rastrear quem realizou cada operação, para que eu tenha controle sobre as transações.

#### Acceptance Criteria

1. WHEN uma venda é confirmada THEN o Sistema POS SHALL registrar identificador do caixa que realizou a venda
2. WHEN um pagamento é recebido THEN o Sistema POS SHALL registrar identificador do caixa que recebeu
3. WHEN um item ou preço é alterado THEN o Sistema POS SHALL registrar alteração com valor anterior, novo valor, timestamp e usuário
