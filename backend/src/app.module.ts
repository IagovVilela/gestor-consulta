import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './common/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { AgendaModule } from './modules/agenda/agenda.module';
import { PacientesModule } from './modules/pacientes/pacientes.module';
import { ProntuarioModule } from './modules/prontuario/prontuario.module';
import { ConsultasModule } from './modules/consultas/consultas.module';
import { RelatoriosModule } from './modules/relatorios/relatorios.module';
import { NotificacoesModule } from './modules/notificacoes/notificacoes.module';
import { ConfiguracoesModule } from './modules/configuracoes/configuracoes.module';
import { ProfissionaisModule } from './modules/profissionais/profissionais.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    AuthModule,
    DashboardModule,
    AgendaModule,
    PacientesModule,
    ProntuarioModule,
    ConsultasModule,
    RelatoriosModule,
    NotificacoesModule,
    ConfiguracoesModule,
    ProfissionaisModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}

