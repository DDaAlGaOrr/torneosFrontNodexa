import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, RouterLinkActive } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { SharedModule } from 'primeng/api';
import { SidebarModule } from 'primeng/sidebar';
import { AuthService, UserRole } from '../../auth/auth/service/auth.service';
import { AdminMenuService } from '../admin-menu.service';

interface NavChild {
  label: string;
  route: string;
}

interface NavItem {
  label: string;
  icon: string;
  route?: string;
  children?: NavChild[];
  expanded?: boolean;
  roles?: UserRole[];
}

@Component({
  standalone: true,
  selector: 'app-sidebar',
  imports: [CommonModule, RouterModule, RouterLinkActive, SidebarModule, SharedModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent {

  constructor(private sanitizer: DomSanitizer, private auth: AuthService, readonly menu: AdminMenuService) { }

  isCollapsed = false;

  toggleSidebar(): void {
    this.isCollapsed = !this.isCollapsed;
  }

  private readonly allItems: NavItem[] = [
    {
      label: 'Liga',
      icon: 'league',
      roles: ['admin'],
      expanded: true,
      children: [
        { label: 'Torneos', route: 'torneos' },
        { label: 'Equipos', route: 'equipos' },
      ],
    },
    {
      label: 'Arbitraje',
      icon: 'match',
      roles: ['referee'],
      expanded: true,
      children: [
        { label: 'Mis partidos', route: 'mis-partidos' },
      ],
    },
    {
      label: 'Catálogos',
      icon: 'catalog',
      roles: ['admin'],
      expanded: true,
      children: [
        { label: 'Categorías', route: 'categorias' },
        { label: 'Canchas', route: 'canchas' },
        { label: 'Usuarios', route: 'usuarios' },
      ],
    },
  ];

  /** Solo las secciones que el rol del usuario puede abrir */
  navItems: NavItem[] = this.allItems.filter((item) => !item.roles || this.auth.hasRole(...item.roles));

  /* ngOnInit(): void {} */

  toggleExpand(item: NavItem): void {
    if (item.children) {
      const isOpen = item.expanded;
      // Cierra todos
      this.navItems.forEach(n => n.expanded = false);
      // Abre solo el seleccionado (toggle)
      item.expanded = !isOpen;
    }
  }

  getIcon(icon: string): SafeHtml {
    const icons: Record<string, string> = {
      league: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
      match: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
      catalog: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>`,
    };
    return this.sanitizer.bypassSecurityTrustHtml(icons[icon] ?? '');
  }
}
