# ---- build ----
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
# Cache de dependências: baixa antes de copiar o código-fonte.
COPY pom.xml .
RUN mvn -B -q dependency:go-offline
COPY src ./src
# Testes precisam de banco; pulam no build da imagem.
RUN mvn -B -q clean package -DskipTests

# ---- runtime ----
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
# Cloud Run injeta PORT (default 8080); o Spring lê via server.port.
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
