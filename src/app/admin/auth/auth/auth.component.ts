import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { PasswordModule } from 'primeng/password';
import { AuthService } from './service/auth.service';
import { apiErrorMessage } from '../../../core/api/api-error';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, ButtonModule, InputTextModule, MessageModule, PasswordModule],
  templateUrl: './auth.component.html',
  styleUrls: ['./auth.component.scss'],
})
export class AuthComponent implements OnInit {
  authForm!: FormGroup;
  loading = false;
  error = '';

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router,
  ) { }

  ngOnInit() {
    // Si ya está logueado, redirigir directo al admin
    if (this.authService.isLoggedIn()) {
      this.redirectAfterLogin();
    }

    this.authForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
    });
  }

  onSubmited() {
    if (this.authForm.invalid) return;

    this.loading = true;
    this.error = '';

    const { email, password } = this.authForm.value;

    this.authService.login(email, password).subscribe({
      next: () => {
        this.loading = false;
        this.redirectAfterLogin();
      },
      error: (err) => {
        this.loading = false;
        this.error = apiErrorMessage(err, 'No se pudo iniciar sesión');
      },
    });
  }




  // Por ahora solo el administrador tiene panel; los demás roles se agregarán después
  private redirectAfterLogin() {
    this.router.navigate(['/admin']);
  }
}
