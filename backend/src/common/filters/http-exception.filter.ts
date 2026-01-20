import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let message: string = 'Internal server error';
    
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      
      // Extrair mensagem corretamente
      if (typeof response === 'string') {
        message = response;
      } else if (typeof response === 'object' && response !== null) {
        // Se é um objeto, tentar extrair a mensagem
        if ('message' in response) {
          const msg = (response as any).message;
          if (typeof msg === 'string') {
            message = msg;
          } else if (Array.isArray(msg)) {
            // Se é um array de mensagens de validação, pegar a primeira
            message = msg[0] || 'Erro de validação';
          } else {
            message = JSON.stringify(msg);
          }
        } else {
          message = JSON.stringify(response);
        }
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    // Log detalhado do erro (apenas para erros não-401 para evitar spam)
    if (status !== 401) {
      console.error('═══════════════════════════════════════════════════════');
      console.error('❌ ERRO CAPTURADO PELO FILTRO GLOBAL');
      console.error('═══════════════════════════════════════════════════════');
      console.error('Timestamp:', new Date().toISOString());
      console.error('Path:', request.url);
      console.error('Method:', request.method);
      console.error('Status:', status);
      console.error('Exception:', exception);
      console.error('Message:', message);
      if (exception instanceof Error) {
        console.error('Stack:', exception.stack);
      }
      console.error('═══════════════════════════════════════════════════════');
    }

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: message,
    });
  }
}



