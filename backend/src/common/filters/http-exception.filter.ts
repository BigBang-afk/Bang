import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const isHttp = exception instanceof HttpException;
    const status = isHttp ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const body = isHttp ? exception.getResponse() : { message: 'Internal server error' };

    if (!isHttp) {
      this.logger.error(exception instanceof Error ? exception.stack : exception);
    }

    const payload = typeof body === 'string' ? { message: body } : body;

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      ...payload,
    });
  }
}
