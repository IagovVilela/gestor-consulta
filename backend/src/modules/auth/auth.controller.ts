import { Controller, Post, Body, Get, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('register')
  @UseGuards(JwtAuthGuard)
  async register(@Body() registerDto: RegisterDto, @CurrentUser() user?: any) {
    // Apenas ADMIN pode criar qualquer tipo de usuário
    // Médicos podem criar apenas SECRETARIA
    if (user?.role?.toUpperCase() === 'MEDICO') {
      if (registerDto.role && registerDto.role !== 'SECRETARIA') {
        throw new ForbiddenException('Médicos podem criar apenas secretárias');
      }
      // Forçar role SECRETARIA e usar clínica do médico
      registerDto.role = 'SECRETARIA';
      registerDto.clinicaId = user.clinicaId || undefined;
      return this.authService.createSecretaria(registerDto, user.id);
    } else if (user?.role?.toUpperCase() !== 'ADMIN') {
      throw new ForbiddenException('Apenas administradores e médicos podem criar usuários');
    }
    
    // Validar que MEDICO e SECRETARIA devem ter clínica
    if ((registerDto.role === 'MEDICO' || registerDto.role === 'SECRETARIA') && !registerDto.clinicaId) {
      throw new ForbiddenException('Médicos e secretárias devem estar vinculados a uma clínica');
    }
    
    return this.authService.register(registerDto);
  }

  @Post('secretarias')
  @UseGuards(JwtAuthGuard)
  async createSecretaria(@Body() registerDto: RegisterDto, @CurrentUser() user?: any) {
    if (user?.role?.toUpperCase() !== 'MEDICO') {
      throw new ForbiddenException('Apenas médicos podem criar secretárias');
    }
    return this.authService.createSecretaria(registerDto, user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@Request() req) {
    return req.user;
  }
}



