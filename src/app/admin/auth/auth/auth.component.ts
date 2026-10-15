import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from './service/auth.service';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
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
        alert('usuario o contraseña incorrectos')
        this.loading = false;
        this.error = err.error?.error || 'Credenciales incorrectas';
      },
    });
  }




  // Redirigir según el rol y deporte del usuario
  private redirectAfterLogin() {
    const user = this.authService.getUser();
    if (!user) return;

    if (user.role === 'admin') {
      // Admin general → overview de soccer por defecto
      this.router.navigate(['/admin/soccer/tournaments']);
    } else if (user.sport) {
      // Admin de deporte → su propio deporte
      this.router.navigate([`/admin/${user.sport}/tournaments`]);
    } else {
      this.router.navigate(['/admin']);
    }
  }
}
