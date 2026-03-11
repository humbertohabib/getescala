FROM maven:3.9.9-eclipse-temurin-21 AS build

WORKDIR /app

COPY pom.xml ./pom.xml
COPY src ./src

RUN mvn -DskipTests package \
  && cp "$(ls target/backend-*.jar | grep -v 'original-' | head -n 1)" target/app.jar

FROM eclipse-temurin:21-jre

WORKDIR /app

COPY --from=build /app/target/app.jar ./app.jar

ENV JAVA_OPTS=""

EXPOSE 8080

CMD ["sh","-c","java $JAVA_OPTS -jar /app/app.jar"]
