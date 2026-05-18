import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { getFrontendUrl } from './lib/frontend';

async function bootstrap() {
    const app = await NestFactory.create(AppModule, {
        rawBody: true, // Habilitar rawBody para Stripe Webhooks
    });

    // Configurar CORS para permitir cookies
    app.enableCors({
        origin: getFrontendUrl(), // Permitir solo el frontend
        credentials: true, // IMPORTANTE: permitir cookies
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
        allowedHeaders: 'Content-Type, Accept, Authorization',
    });

    // Usar cookie parser para manejar cookies en las solicitudes
    app.use(cookieParser());

    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true, // Eliminar propiedades no definidas en los DTOs
            forbidNonWhitelisted: true, // Lanzar error si hay propiedades no definidas
            transform: true, // Transformar payloads a los tipos definidos en los DTOs
        }),
    );

    app.use(helmet()); // Agregar Helmet para mejorar la seguridad de las cabeceras HTTP

    await app.listen(process.env.PORT ?? 3000);
}
bootstrap().catch((err) => {
    console.error('Error starting the application:', err);
    process.exit(1);
});
