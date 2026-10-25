import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';

/** Componentes de PrimeNG que comparten todas las pantallas de administración. */
export const CRUD_UI = [
  TableModule,
  ButtonModule,
  DialogModule,
  InputTextModule,
  TagModule,
  ToastModule,
  ConfirmDialogModule,
  TooltipModule,
] as const;
