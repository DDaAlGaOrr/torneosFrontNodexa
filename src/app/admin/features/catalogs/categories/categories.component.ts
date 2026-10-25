import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Observable } from 'rxjs';
import { apiErrorMessage } from '../../../../core/api/api-error';
import { CategoriesApi, Category } from '../../../../core/api/categories.api';
import { CRUD_UI } from '../../../../core/ui/crud-ui';
import { notBlank } from '../../../../core/ui/validators';

@Component({
  standalone: true,
  selector: 'app-categories',
  imports: [CommonModule, ReactiveFormsModule, ...CRUD_UI],
  providers: [MessageService, ConfirmationService],
  templateUrl: './categories.component.html',
  styleUrls: ['../../../../styles/crud.scss'],
})
export class CategoriesComponent implements OnInit {
  private readonly api = inject(CategoriesApi);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(MessageService);
  private readonly confirm = inject(ConfirmationService);

  items = signal<Category[]>([]);
  loading = signal(true);
  saving = signal(false);
  error = signal('');

  dialogVisible = false;
  editing: Category | null = null;
  formError = signal('');

  // categories.name es varchar(50)
  form = this.fb.nonNullable.group({
    name: ['', [Validators.required, notBlank, Validators.maxLength(50)]],
  });

  ngOnInit(): void {
    this.load();
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
        this.error.set(apiErrorMessage(err, 'No se pudieron cargar las categorías'));
        this.loading.set(false);
      },
    });
  }

  openCreate(): void {
    this.editing = null;
    this.form.reset({ name: '' });
    this.formError.set('');
    this.dialogVisible = true;
  }

  openEdit(category: Category): void {
    this.editing = category;
    this.form.reset({ name: category.name });
    this.formError.set('');
    this.dialogVisible = true;
  }

  fieldInvalid(name: 'name'): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.touched || c.dirty);
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const name = this.form.getRawValue().name.trim();
    const request: Observable<unknown> = this.editing ? this.api.update(this.editing.id, name) : this.api.create(name);

    this.saving.set(true);
    this.formError.set('');
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.dialogVisible = false;
        this.toast.add({ severity: 'success', summary: this.editing ? 'Categoría actualizada' : 'Categoría creada', detail: name });
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.formError.set(apiErrorMessage(err, 'No se pudo guardar la categoría'));
      },
    });
  }

  remove(category: Category): void {
    this.confirm.confirm({
      header: 'Eliminar categoría',
      message: `¿Eliminar la categoría "${category.name}"?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-text',
      accept: () =>
        this.api.remove(category.id).subscribe({
          next: () => {
            this.toast.add({ severity: 'success', summary: 'Categoría eliminada', detail: category.name });
            this.load();
          },
          // Si está en uso por equipos o torneos, la API explica por qué no se puede borrar
          error: (err) =>
            this.toast.add({ severity: 'error', summary: 'No se pudo eliminar', detail: apiErrorMessage(err), life: 7000 }),
        }),
    });
  }
}
