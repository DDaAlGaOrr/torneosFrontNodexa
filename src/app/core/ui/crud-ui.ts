import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { KeyFilterModule } from 'primeng/keyfilter';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { DialogDefaultsDirective } from './dialog-defaults.directive';

/** Componentes de PrimeNG que comparten todas las pantallas de administración. */
export const CRUD_UI = [
  TableModule,
  ButtonModule,
  DialogModule,
  DialogDefaultsDirective,
  InputTextModule,
  KeyFilterModule,
  TagModule,
  ToastModule,
  ConfirmDialogModule,
  TooltipModule,
] as const;
