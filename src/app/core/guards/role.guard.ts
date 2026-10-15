import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';

export const roleGuard: CanActivateFn = (route) => {
  const userRole = 'rolSoccer'; // fake

  const allowedRoles = route.data?.['roles'] || [];

  return allowedRoles.includes(userRole);
};
