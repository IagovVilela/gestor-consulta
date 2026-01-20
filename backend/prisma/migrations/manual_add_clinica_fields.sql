-- Adicionar campos opcionais primeiro
ALTER TABLE `clinicas` ADD COLUMN `ownerId` VARCHAR(191) NULL;
ALTER TABLE `pacientes` ADD COLUMN `clinicaId` VARCHAR(191) NULL;
ALTER TABLE `pacientes` ADD COLUMN `medicoPreferencialId` VARCHAR(191) NULL;
ALTER TABLE `users` ADD COLUMN `clinicaId` VARCHAR(191) NULL;

-- Criar tabela secretarias_medicos
CREATE TABLE IF NOT EXISTS `secretarias_medicos` (
  `id` VARCHAR(191) NOT NULL,
  `secretariaId` VARCHAR(191) NOT NULL,
  `medicoId` VARCHAR(191) NOT NULL,
  `active` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `secretarias_medicos_secretariaId_medicoId_key` (`secretariaId`, `medicoId`),
  INDEX `secretarias_medicos_secretariaId_idx` (`secretariaId`),
  INDEX `secretarias_medicos_medicoId_idx` (`medicoId`),
  CONSTRAINT `secretarias_medicos_secretariaId_fkey` FOREIGN KEY (`secretariaId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `secretarias_medicos_medicoId_fkey` FOREIGN KEY (`medicoId`) REFERENCES `profissionais` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Adicionar campos de personalização em clinicas
ALTER TABLE `clinicas` ADD COLUMN `logoUrl` VARCHAR(191) NULL;
ALTER TABLE `clinicas` ADD COLUMN `corPrimaria` VARCHAR(191) NULL;
ALTER TABLE `clinicas` ADD COLUMN `corSecundaria` VARCHAR(191) NULL;

-- Adicionar índices (ignorar erro se já existir)
CREATE INDEX `users_clinicaId_idx` ON `users` (`clinicaId`);
CREATE INDEX `pacientes_clinicaId_idx` ON `pacientes` (`clinicaId`);
CREATE INDEX `pacientes_medicoPreferencialId_idx` ON `pacientes` (`medicoPreferencialId`);
CREATE INDEX `clinicas_ownerId_idx` ON `clinicas` (`ownerId`);

-- Adicionar foreign keys
ALTER TABLE `users` ADD CONSTRAINT `users_clinicaId_fkey` FOREIGN KEY (`clinicaId`) REFERENCES `clinicas` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `pacientes` ADD CONSTRAINT `pacientes_clinicaId_fkey` FOREIGN KEY (`clinicaId`) REFERENCES `clinicas` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `pacientes` ADD CONSTRAINT `pacientes_medicoPreferencialId_fkey` FOREIGN KEY (`medicoPreferencialId`) REFERENCES `profissionais` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `clinicas` ADD CONSTRAINT `clinicas_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

