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

## Endpoints (feature 001)

| Método | Rota | Descrição |
|---|---|---|
| GET | `/me` | Perfil + agregados de progresso do estudante autenticado |
| PATCH | `/me` | Atualiza nome de exibição/avatar (422 em dado inválido) |

Erros seguem o formato `{ "code", "message", "correlationId" }`; envie `X-Correlation-Id` para correlacionar logs.
