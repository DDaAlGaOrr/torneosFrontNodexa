import { AbstractControl, ValidationErrors } from '@angular/forms';

/** Rechaza textos vacíos o formados solo por espacios. */
export function notBlank(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  return typeof value === 'string' && value.trim().length === 0 ? { blank: true } : null;
}

/** Acepta vacío o una URL que empiece con http:// o https:// */
export function optionalHttpUrl(control: AbstractControl): ValidationErrors | null {
  const value = (control.value ?? '').toString().trim();
  return value === '' || /^https?:\/\/\S+$/i.test(value) ? null : { url: true };
}
