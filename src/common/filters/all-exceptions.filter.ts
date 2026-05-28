import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Error as MongooseError } from 'mongoose';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, message } = this.resolveException(exception);

    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} → ${status}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(status).json({
      statusCode: status,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }

  private resolveException(exception: unknown): { status: number; message: string } {
    if (exception instanceof HttpException) {
      const res = exception.getResponse();
      const message =
        typeof res === 'string'
          ? res
          : (res as { message?: string | string[] }).message
            ? Array.isArray((res as { message: string[] }).message)
              ? (res as { message: string[] }).message.join('; ')
              : String((res as { message: string }).message)
            : exception.message;
      return { status: exception.getStatus(), message };
    }

    // Mongoose: clave duplicada
    if (
      exception &&
      typeof exception === 'object' &&
      'code' in exception &&
      (exception as { code: number }).code === 11000
    ) {
      return { status: HttpStatus.CONFLICT, message: 'Ya existe un registro con esa clave.' };
    }

    // Mongoose: validación de schema
    if (exception instanceof MongooseError.ValidationError) {
      const message = Object.values(exception.errors)
        .map((e) => e.message)
        .join('; ');
      return { status: HttpStatus.BAD_REQUEST, message };
    }

    return { status: HttpStatus.INTERNAL_SERVER_ERROR, message: 'Error interno del servidor.' };
  }
}
