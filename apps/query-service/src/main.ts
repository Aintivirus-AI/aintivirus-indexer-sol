import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { EnvService } from "./shared/env.service";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const env = app.get(EnvService);
  const corsOrigin = env.get("CORS_ORIGIN");
  app.enableCors({ origin: corsOrigin === "*" ? true : corsOrigin });
  await app.listen(env.getNumber("PORT", 8090));
}

bootstrap();
