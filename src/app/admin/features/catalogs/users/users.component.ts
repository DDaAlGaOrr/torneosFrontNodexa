import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';
import { DropdownModule } from 'primeng/dropdown';
import { InputSwitchModule } from 'primeng/inputswitch';
import { PasswordModule } from 'primeng/password';
import { SelectButtonModule } from 'primeng/selectbutton';
import { Observable } from 'rxjs';
import { AuthService } from '../../../auth/auth/service/auth.service';
import { apiErrorMessage } from '../../../../core/api/api-error';
import { ManagedRole, ManagedUser, UsersApi } from '../../../../core/api/users.api';
import { CRUD_UI } from '../../../../core/ui/crud-ui';
import { notBlank } from '../../../../core/ui/validators';

interface RoleTab {
  role: ManagedRole;
  label: string;
  singular: string;
}

@Component({
  standalone: true,
  selector: 'app-users',
  imports: [CommonModule, ReactiveFormsModule, FormsModule, ...CRUD_UI, DropdownModule, InputSwitchModule, PasswordModule, SelectButtonModule],
  providers: [MessageService, ConfirmationService],
  templateUrl: './users.component.html',
  styleUrls: ['../../../../styles/crud.scss'],
})
export class UsersComponent implements OnInit {
  private readonly api = inject(UsersApi);
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(MessageService);
  private readonly confirm = inject(ConfirmationService);

  readonly tabs: RoleTab[] = [
    { role: 'coach', label: 'Entrenadores', singular: 'entrenador' },
    { role: 'referee', label: 'Árbitros', singular: 'árbitro' },
    { role: 'admin', label: 'Administradores', singular: 'administrador' },
  ];

  role = signal<ManagedRole>('coach');
  roleCtrl = new FormControl<ManagedRole>('coach', { nonNullable: true });
  items = signal<ManagedUser[]>([]);
  loading = signal(true);
  saving = signal(false);
  error = signal('');
  readonly currentUserId = this.auth.getUser()?.id;

  dialogVisible = false;
  editing: ManagedUser | null = null;
  formError = signal('');

  currentTab = computed(() => this.tabs.find((t) => t.role === this.role())!);

  // ── Cambiar rol ───────────────────────────────────────────────────────────
  roleVisible = false;
  roleUser: ManagedUser | null = null;
  newRole: ManagedRole | null = null;
  roleError = signal('');
  roleOptions = computed(() => this.tabs.filter((t) => t.role !== this.role()).map((t) => ({ value: t.role, label: t.singular[0].toUpperCase() + t.singular.slice(1) })));

  // ── Restablecer contraseña ────────────────────────────────────────────────
  passVisible = false;
  passUser: ManagedUser | null = null;
  newPassword = '';
  passError = signal('');

  // users: name varchar(100), email varchar(150)
  form = this.fb.nonNullable.group({
    name: ['', [Validators.required, notBlank, Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(150)]],
    password: [''],
    active: [true],
  });

  ngOnInit(): void {
    this.load();
  }

  selectRole(role: ManagedRole | null): void {
    // El selector no permite quedar sin opción; si llega null se conserva la actual
    if (!role) {
      this.roleCtrl.setValue(this.role());
      return;
    }
    if (role === this.role()) return;
    this.role.set(role);
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.api.list(this.role()).subscribe({
      next: (res) => {
        this.items.set(res.data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(apiErrorMessage(err, 'No se pudieron cargar los usuarios'));
        this.loading.set(false);
      },
    });
  }

  openCreate(): void {
    this.editing = null;
    this.form.reset({ name: '', email: '', password: '', active: true });
    // La contraseña solo se captura al crear
    this.form.controls.password.setValidators([Validators.required, Validators.minLength(8), Validators.maxLength(72)]);
    this.form.controls.password.updateValueAndValidity();
    this.formError.set('');
    this.dialogVisible = true;
  }

  openEdit(user: ManagedUser): void {
    this.editing = user;
    this.form.reset({ name: user.name, email: user.email, password: '', active: user.active === 1 });
    this.form.controls.password.clearValidators();
    this.form.controls.password.updateValueAndValidity();
    this.formError.set('');
    this.dialogVisible = true;
  }

  fieldInvalid(name: 'name' | 'email' | 'password'): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.touched || c.dirty);
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    const name = raw.name.trim();
    const email = raw.email.trim().toLowerCase();
    const editing = this.editing;

    const request: Observable<unknown> = editing
      ? this.api.update(this.role(), editing.id, { name, email, active: raw.active ? 1 : 0 })
      : this.api.create(this.role(), { name, email, password: raw.password });

    this.saving.set(true);
    this.formError.set('');
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.dialogVisible = false;
        this.toast.add({ severity: 'success', summary: editing ? 'Usuario actualizado' : 'Usuario creado', detail: name });
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.formError.set(apiErrorMessage(err, 'No se pudo guardar el usuario'));
      },
    });
  }

  openRole(user: ManagedUser): void {
    this.roleUser = user;
    this.newRole = null;
    this.roleError.set('');
    this.roleVisible = true;
  }

  /** Qué pasa con sus asignaciones al dejar el rol actual */
  roleWarning(): string {
    if (this.role() === 'coach') return 'Dejará de ser entrenador de sus equipos.';
    if (this.role() === 'referee') return 'Se quitará de los partidos que aún no terminan (los finalizados conservan el historial).';
    return '';
  }

  saveRole(): void {
    const user = this.roleUser;
    if (!user || !this.newRole) return;
    const target = this.tabs.find((t) => t.role === this.newRole)!;
    this.saving.set(true);
    this.api.changeRole(this.role(), user.id, this.newRole).subscribe({
      next: () => {
        this.saving.set(false);
        this.roleVisible = false;
        this.toast.add({ severity: 'success', summary: 'Rol actualizado', detail: `${user.name} ahora es ${target.singular}. Verá su nuevo panel al volver a iniciar sesión.`, life: 6000 });
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.roleError.set(apiErrorMessage(err));
      },
    });
  }

  openPassword(user: ManagedUser): void {
    this.passUser = user;
    this.newPassword = '';
    this.passError.set('');
    this.passVisible = true;
  }

  savePassword(): void {
    const user = this.passUser;
    if (!user) return;
    if (this.newPassword.length < 8 || this.newPassword.length > 72) {
      this.passError.set('La contraseña debe tener entre 8 y 72 caracteres');
      return;
    }
    this.saving.set(true);
    this.api.resetPassword(this.role(), user.id, this.newPassword).subscribe({
      next: () => {
        this.saving.set(false);
        this.passVisible = false;
        this.newPassword = '';
        this.toast.add({ severity: 'success', summary: 'Contraseña actualizada', detail: `Comparte la nueva contraseña con ${user.name} por un medio seguro.`, life: 6000 });
      },
      error: (err) => {
        this.saving.set(false);
        this.passError.set(apiErrorMessage(err));
      },
    });
  }

  remove(user: ManagedUser): void {
    if (user.id === this.currentUserId) return;
    this.confirm.confirm({
      header: 'Eliminar usuario',
      message: `¿Eliminar a ${user.name}? Esta acción no se puede deshacer.`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-text',
      accept: () =>
        this.api.remove(this.role(), user.id).subscribe({
          next: () => {
            this.toast.add({ severity: 'success', summary: 'Usuario eliminado', detail: user.name });
            this.load();
          },
          error: (err) =>
            this.toast.add({ severity: 'error', summary: 'No se pudo eliminar', detail: apiErrorMessage(err), life: 7000 }),
        }),
    });
  }
}
