# GETESCALA

Monorepo inicial do GETESCALA.

## Pré-requisitos

- Java 21
- Maven 3.9+
- Node.js 22+ (Node 23 funciona, mas alguns pacotes podem emitir warnings de engine)
- Docker + Docker Compose

## Infra local

```bash
docker compose up -d
```

## Backend (Spring Boot)

```bash
cd backend
mvn test
mvn spring-boot:run
```

- API: http://localhost:8080
- Swagger UI: http://localhost:8080/swagger-ui/index.html

## Frontend (Vite + React)

```bash
cd frontend
npm run dev
```

- Web: http://localhost:5173

## Mobile (Expo)

```bash
cd mobile
npm run start
```
