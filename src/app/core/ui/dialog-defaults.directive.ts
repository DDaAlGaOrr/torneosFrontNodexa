import { Directive, inject } from '@angular/core';
import { Dialog } from 'primeng/dialog';

/**
 * Ajustes comunes de todos los p-dialog del panel: no se pueden redimensionar
 * (al estirarlos se desacomodaban los campos) ni arrastrar fuera de su lugar.
 * Un [resizable] o [draggable] escrito en la plantilla sigue teniendo prioridad.
 */
@Directive({ selector: 'p-dialog', standalone: true })
export class DialogDefaultsDirective {
  constructor() {
    const dialog = inject(Dialog);
    dialog.resizable = false;
    dialog.draggable = false;
  }
}
