import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, RouterLinkActive } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

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
}

@Component({
  standalone: true,
  selector: 'app-sidebar',
  imports: [CommonModule, RouterModule, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent {

  constructor(private sanitizer: DomSanitizer) { }

  isCollapsed = false;

  toggleSidebar(): void {
    this.isCollapsed = !this.isCollapsed;
  }

  navItems: NavItem[] = [
    {
      label: 'Soccer',
      icon: 'soccer',
      route: '/soccer',
      expanded: true,
      children: [
        /* { label: 'Overview', route: 'soccer/overview' }, */
        { label: 'Teams', route: 'soccer/teams' },
        { label: 'Matches', route: 'soccer/matches' },
        { label: 'Tournaments', route: 'soccer/tournaments' },
        /* { label: 'Events', route: '/soccer/events' }, */
        /* { label: 'Points Table', route: '/soccer/points-table' }, */
      ],
    },
    {
      label: 'Volleyball',
      icon: 'volleyball',
      route: '/volleyball',
      expanded: false,
      children: [
        /* { label: 'Overview', route: 'volleyball/overview' }, */
        { label: 'Teams', route: 'volleyball/teams' },
        { label: 'Matches', route: 'volleyball/matches' },
        { label: 'Tournaments', route: 'volleyball/tournaments' },
        /* { label: 'Events', route: '/volleyball/events' }, */
        /* { label: 'Points Table', route: '/volleyball/points-table' }, */
      ],
    },
    {
      label: 'Basketball',
      icon: 'basketball',
      route: '/basketball',
      expanded: false,
      children: [
        /* { label: 'Overview', route: 'basketball/overview' }, */
        { label: 'Teams', route: 'basketball/teams' },
        { label: 'Matches', route: 'basketball/matches' },
        { label: 'Tournaments', route: 'basketball/tournaments' },
        /* { label: 'Events', route: '/basketball/events' }, */
        /* { label: 'Points Table', route: '/basketball/points-table' }, */
      ],
    },
  ];

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

  getSportIcon(icon: string): SafeHtml { // ← cambia el tipo de retorno
    const icons: Record<string, string> = {
      soccer: `<svg xmlns="http://www.w3.org/2000/svg" width="46.5" height="48" viewBox="0 0 496 512"><path fill="#4f46e5" d="M483.8 179.4C449.8 74.6 352.6 8 248.1 8c-25.4 0-51.2 3.9-76.7 12.2C41.2 62.5-30.1 202.4 12.2 332.6C46.2 437.4 143.4 504 247.9 504c25.4 0 51.2-3.9 76.7-12.2c130.2-42.3 201.5-182.2 159.2-312.4m-74.5 193.7l-52.2 6.4l-43.7-60.9l24.4-75.2l71.1-22.1l38.9 36.4c-.2 30.7-7.4 61.1-21.7 89.2c-4.7 9.3-10.7 17.8-16.8 26.2m0-235.4l-10.4 53.1l-70.7 22l-64.2-46.5V92.5l47.4-26.2c39.2 13 73.4 38 97.9 71.4M184.9 66.4L232 92.5v73.8l-64.2 46.5l-70.6-22l-10.1-52.5c24.3-33.4 57.9-58.6 97.8-71.9M139 379.5L85.9 373c-14.4-20.1-37.3-59.6-37.8-115.3l39-36.4l71.1 22.2l24.3 74.3zm48.2 67l-22.4-48.1l43.6-61.7H287l44.3 61.7l-22.4 48.1c-6.2 1.8-57.6 20.4-121.7 0"/></svg>`,
      volleyball: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><g fill="none" stroke="#4f46e5" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M11.1 7.1a16.55 16.55 0 0 1 10.9 4M12 12a12.6 12.6 0 0 1-8.7 5m13.5-3.4a16.55 16.55 0 0 1-9 7.5"/><path d="M20.7 17a12.8 12.8 0 0 0-8.7-5a13.3 13.3 0 0 1 0-10M6.3 3.8a16.55 16.55 0 0 0 1.9 11.5"/><circle cx="12" cy="12" r="10"/></g></svg>`,
      basketball: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><g fill="none" stroke="#4f46e5" stroke-width="1.5"><path d="M3.34 17c2.76 4.783 8.876 6.42 13.66 3.66a9.96 9.96 0 0 0 4.196-4.731a9.99 9.99 0 0 0-.536-8.93a9.99 9.99 0 0 0-7.465-4.928A9.96 9.96 0 0 0 7 3.339C2.217 6.101.578 12.217 3.34 17Z"/><path stroke-linecap="round" d="M16.95 20.573S16.01 13.982 14 10.5S7.05 3.427 7.05 3.427"/><path stroke-linecap="round" d="M21.864 12.58c-5.411-1.187-12.805 3.768-14.287 8.238m8.837-17.609c-1.488 4.42-8.74 9.303-14.125 8.243"/></g></svg>`,
    };

    const svg = icons[icon] ?? '';
    return this.sanitizer.bypassSecurityTrustHtml(svg); // ← marca como seguro
  }

}
