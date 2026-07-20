# Kaptika API (backend)

API do Kaptika — microlearning gamificado para o ENEM. Spring Boot 4.x, Java 21, PostgreSQL (Supabase).

## Rodar localmente

Pré-requisitos: Java 21+. O Maven vem via wrapper (`./mvnw`).

```bash
# variáveis (exemplo)
export DB_URL=jdbc:postgresql://localhost:5432/kaptika
export DB_USER=kaptika
export DB_PASSWORD=kaptika
export SUPABASE_JWKS_URI=https://<projeto>.supabase.co/auth/v1/.well-known/jwks.json

./mvnw spring-boot:run
```

As migrações (Flyway) rodam automaticamente na subida. `GET /actuator/health` é público; todo o resto exige `Authorization: Bearer <jwt do Supabase>`.

## Testes e cobertura

```bash
./mvnw verify
```

- Testes de integração usam **Postgres real embarcado** (Zonky) — sem Docker — com as migrações de produção.
- JWTs de teste são assinados com chave RSA local, exercitando os caminhos reais de validação (expirado, adulterado, malformado).
- **JaCoCo** gera o relatório em `target/site/jacoco/index.html` e falha o build abaixo de **80% de linhas**.

## Endpoints

| Método | Rota | Feature | Descrição |
|---|---|---|---|
| GET | `/me` | 001 | Perfil + agregados reais (XP/nível, ofensiva, medalhas) |
| PATCH | `/me` | 001 | Atualiza nome de exibição/avatar (422 em dado inválido) |
| POST | `/sessions` | 002 | Cria sessão por área (201) ou devolve a ativa (200) |
| GET | `/sessions/{id}` | 002 | Estado para retomada (sem gabarito) |
| POST | `/sessions/{id}/answers` | 002 | Correção idempotente; alteração → 409 |
| POST | `/sessions/{id}/finish` | 002 | Encerra com resumo; idempotente |
| GET | `/me/xp` | 003 | XP total, nível, XP p/ próximo nível, XP da semana |
| GET | `/me/streak` | 004 | Ofensiva atual, recorde, freezes, sinal de quebra |
| GET | `/me/badges` | 005 | Coleção de medalhas + progresso das cumulativas |
| GET | `/leaderboard` | 006 | Ranking global/semanal paginado + posição própria |

Erros seguem o formato `{ "code", "message", "correlationId" }`; envie `X-Correlation-Id` para correlacionar logs.
