import { Routes } from '@angular/router';

export const routes: Routes = [
    {
    path: 'admin',
    loadChildren: () =>
      import('./admin/admin.routes').then(m => m.ADMIN_ROUTES),
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./admin/auth/auth/auth.component').then(m => m.AuthComponent),
  },
  {
    path: '',
    loadComponent: () =>
      import('./end-user/layout/end-user-layout/end-user-layout.component')
        .then(m => m.EndUserLayoutComponent),
    children: [
      {
        path: '',
        loadChildren: () =>
          import('./end-user/end-user.routes').then(m => m.END_USER_ROUTES)
      }
    ]
  }
];
