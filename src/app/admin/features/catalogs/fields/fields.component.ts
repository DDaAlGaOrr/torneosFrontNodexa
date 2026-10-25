import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Observable } from 'rxjs';
import { apiErrorMessage } from '../../../../core/api/api-error';
import { Field, FieldsApi } from '../../../../core/api/fields.api';
import { CRUD_UI } from '../../../../core/ui/crud-ui';
import { notBlank, optionalHttpUrl } from '../../../../core/ui/validators';

@Component({
  standalone: true,
  selector: 'app-fields',
  imports: [CommonModule, ReactiveFormsModule, ...CRUD_UI],
  providers: [MessageService, ConfirmationService],
  templateUrl: './fields.component.html',
  styleUrls: ['../../../../styles/crud.scss'],
})
export class FieldsComponent implements OnInit {
  private readonly api = inject(FieldsApi);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(MessageService);
  private readonly confirm = inject(ConfirmationService);

  items = signal<Field[]>([]);
  loading = signal(true);
  saving = signal(false);
  error = signal('');

  dialogVisible = false;
  editing: Field | null = null;
  formError = signal('');

  // fields: name varchar(100), location varchar(255), maps_url varchar(500)
  form = this.fb.nonNullable.group({
    name: ['', [Validators.required, notBlank, Validators.maxLength(100)]],
    location: ['', [Validators.maxLength(255)]],
    maps_url: ['', [Validators.maxLength(500), optionalHttpUrl]],
  });

  ngOnInit(): void {
    this.load();
  }

  /** Solo se enlazan URLs http(s); cualquier otro valor guardado se ignora. */
  safeUrl(url: string | null): string | null {
    return url && /^https?:\/\//i.test(url) ? url : null;
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.api.list().subscribe({
      next: (res) => {
        this.items.set(res.data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(apiErrorMessage(err, 'No se pudieron cargar las canchas'));
        this.loading.set(false);
      },
    });
  }

  openCreate(): void {
    this.editing = null;
    this.form.reset({ name: '', location: '', maps_url: '' });
    this.formError.set('');
    this.dialogVisible = true;
  }

  openEdit(field: Field): void {
    this.editing = field;
    this.form.reset({ name: field.name, location: field.location ?? '', maps_url: field.maps_url ?? '' });
    this.formError.set('');
    this.dialogVisible = true;
  }

  fieldInvalid(name: 'name' | 'location' | 'maps_url'): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.touched || c.dirty);
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    const body = { name: raw.name.trim(), location: raw.location.trim(), maps_url: raw.maps_url.trim() };
    const request: Observable<unknown> = this.editing ? this.api.update(this.editing.id, body) : this.api.create(body);

    this.saving.set(true);
    this.formError.set('');
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.dialogVisible = false;
        this.toast.add({ severity: 'success', summary: this.editing ? 'Cancha actualizada' : 'Cancha creada', detail: body.name });
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.formError.set(apiErrorMessage(err, 'No se pudo guardar la cancha'));
      },
    });
  }

  remove(field: Field): void {
    this.confirm.confirm({
      header: 'Eliminar cancha',
      message: `¿Eliminar la cancha "${field.name}"? Los partidos que la usaban quedarán sin cancha asignada.`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-text',
      accept: () =>
        this.api.remove(field.id).subscribe({
          next: () => {
            this.toast.add({ severity: 'success', summary: 'Cancha eliminada', detail: field.name });
            this.load();
          },
          error: (err) =>
            this.toast.add({ severity: 'error', summary: 'No se pudo eliminar', detail: apiErrorMessage(err), life: 7000 }),
        }),
    });
  }
}
