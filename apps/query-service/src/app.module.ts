import { Module } from "@nestjs/common";
import { HealthController } from "./health/health.controller";
import { PrismaModule } from "./shared/prisma.module";
import { EnvModule } from "./shared/env.module";
import { MixerModule } from "./mixer/mixer.module";

@Module({
  imports: [EnvModule, PrismaModule, MixerModule],
  controllers: [HealthController],
})
export class AppModule {}
