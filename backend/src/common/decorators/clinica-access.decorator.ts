import { SetMetadata } from '@nestjs/common';

export const CLINICA_ACCESS_KEY = 'clinicaAccess';
export const ClinicaAccess = () => SetMetadata(CLINICA_ACCESS_KEY, true);



