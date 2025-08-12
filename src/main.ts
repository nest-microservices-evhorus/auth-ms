import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { envs } from './config';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('AuthMsMain');
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.NATS,
      options: { servers: envs.natsServers },
    },
  );
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  await app.listen();
  logger.log(`Auth Microservice running or port ${envs.port}`);
}
void bootstrap();
