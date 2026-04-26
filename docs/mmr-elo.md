# MMR (Elo de times) e idempotência

## Média e expectativa

- `avgA`, `avgB`: médias de MMR dos 5 jogadores de cada time.
- Expectativa de vitória do time A (0–1):

\[
E_A = \frac{1}{1 + 10^{(avg_B - avg_A)/400}}
\]

- `E_B = 1 - E_A`.

## Atualização por jogador (K provisório)

- Para cada jogador, `K = 40` se `games_played < 20`, senão `K = 24`.
- Time A, resultado **vitória** de A: para cada membro, `S = 1`; `delta = K * (S - E_A)`.
- Time A, **derrota**: `S = 0`; `delta = K * (0 - E_A)`.
- Time B, espelhado: usa `E_B` e `S = 1` ou `0` conforme o vencedor.
- MMR após: `round(mmr + delta, 2)`.

Cada membro de um time usa o **mesmo** `E` do seu time, mas `K` individual (contas provisórias ajustam mais rápido).

## `k_factor` na tabela `matches`

Armazenamos a média de `K` usada (apenas informativo) ou 24; o delta real fica em `match_participants.mmr_delta`.

## Idempotência de `/resultado`

- Cada partida `matches.id` única, `status` `pending` | `completed`.
- Ao concluir: `status = 'completed'`, `winner` definido, `completed_at` setado.
- Se o handler receber o mesmo vencedor de novo, verifica `status == 'completed'`: responde sucesso idempotente **sem** reaplicar deltas.

- Opcional: coluna `idempotency_key` (texto unique) se no futuro quiseres clientes de fora; o MVP usa exclusivamente `match_id` + `status` como tranca lógica.

## Referências

- Sistema de rating Elo (chess); adaptado para 5v5 com média de time.
