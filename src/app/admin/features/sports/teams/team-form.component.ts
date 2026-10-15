import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiResponse } from 'src/app/interfaces/api.interface';
import { CreateTeam, EditTeam, Team } from 'src/app/interfaces/teams.interface';
import { TeamsService } from 'src/app/services/teams.service';
import { ActivatedRoute, Router } from '@angular/router';

type TeamStatus = 'Active' | 'Suspended' | 'Disqualified' | 'Inactive';

@Component({
    standalone: true,
    selector: 'app-team-form',
    imports: [CommonModule, FormsModule],
    templateUrl: './team-form.component.html',
    styleUrls: ['./team-form.component.scss'],
})
export class TeamFormComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private router = inject(Router);

    public teams = signal<Team[]>([]);
    currentSport: string = '';
    currentSportId: number = 1;
    private readonly teamsService = inject(TeamsService);

    ngOnInit(): void {
        this.route.parent?.paramMap.subscribe(params => {
            this.currentSport = params.get('sport') || 'soccer';
            this.setSportId(this.currentSport);
            this.loadTeams();
        });
    }

    setSportId(sport: string) {
        const sportMap: { [key: string]: number } = {
            'soccer': 1,
            'volleyball': 2,
            'basketball': 3
        };
        this.currentSportId = sportMap[sport] || 1;
    }

    private loadTeams(): void {
        this.teamsService.getAllTeams().subscribe({
            next: (response: ApiResponse<Team[]>) => {
                this.teams.set(response.data);
            },
            error: (error: HttpErrorResponse) => {
                // Manejo de error
            },
            complete: () => { },
        });
    }

    searchQuery = '';

    readonly statusOptions: TeamStatus[] = [
        'Active',
        'Suspended',
        'Disqualified',
        'Inactive',
    ];

    // ── Register ────────────────────────────────────────────────────────────────
    registerForm: CreateTeam = {
        id: 0,
        name: '',
        coach: '',
        contact_email: '',
        contact_phone: '',
        logo_url: '',
        short_name: ''
    };
    registerSubmitted = false;

    // ── Edit ────────────────────────────────────────────────────────────────────
    editingTeam: Team | null = null;
    editForm: EditTeam = {
        id: 0,
        name: '',
        coach: '',
        contact_email: '',
        contact_phone: '',
        logo_url: '',
        short_name: ''
    };
    editSubmitted = false;

    // ── Computed ────────────────────────────────────────────────────────────────
    get filteredTeams(): Team[] {
        const q = this.searchQuery.toLowerCase();
        if (!q) return this.teams();
        return this.teams().filter((t) => t.name.toLowerCase().includes(q));
    }

    get nextId(): number {
        return this.teams.length ? Math.max(...this.teams().map((t) => t.id)) + 1 : 1;
    }

    // ── Register actions ────────────────────────────────────────────────────────
    registerTeam(): void {
        this.registerSubmitted = true;
        if (!this.registerForm.name || !this.registerForm.coach || !this.registerForm.short_name) {
            return;
        }

        this.teamsService.saveTeam(this.registerForm).subscribe({
            next: (response: ApiResponse<any>) => {
                this.resetRegisterForm();
                this.closeModal('registerTeamModal');
                this.loadTeams();
            },
            error: (error: HttpErrorResponse) => {
                alert('Algo salió mal');
            },
            complete: () => { },
        });
    }

    resetRegisterForm(): void {
        this.registerForm = {
            id: 0,
            name: '',
            coach: '',
            contact_email: '',
            contact_phone: '',
            logo_url: '',
            short_name: ''
        };
        this.registerSubmitted = false;
    }

    // ── Edit actions ────────────────────────────────────────────────────────────
    openEditModal(team: Team): void {
        this.editingTeam = team;
        this.editForm = {
            id: team.id,
            name: team.name,
            coach: team.coach,
            short_name: team.short_name,
            contact_email: team.contact_email,
            contact_phone: team.contact_phone,
            logo_url: team.logo_url,
        };
        this.editSubmitted = false;

        const modalEl = document.getElementById('editTeamModal');
        if (modalEl) {
            const modal = new (window as any).bootstrap.Modal(modalEl);
            modal.show();
        }
    }

    saveChanges(): void {
        this.teamsService.editTeam(this.editForm).subscribe({
            next: (response: ApiResponse<any>) => {
                this.editSubmitted = true;
                if (!this.editForm.name || !this.editForm.coach) return;

                this.resetEditForm();
                this.closeModal('editTeamModal');
                this.loadTeams();
            },
            error: (error: HttpErrorResponse) => {
                alert('Algo salió mal');
            },
            complete: () => { },
        });
    }

    resetEditForm(): void {
        this.editingTeam = null;
        this.editForm = {
            id: 0,
            name: '',
            coach: '',
            contact_email: '',
            contact_phone: '',
            logo_url: '',
            short_name: ''
        };
        this.editSubmitted = false;
    }

    // ── Delete ──────────────────────────────────────────────────────────────────
    deleteTeam(id: number): void {
        this.teamsService.deleteTeam(id).subscribe({
            next: (response: ApiResponse<any>) => {
                this.loadTeams();
            },
            error: (error: HttpErrorResponse) => {
                alert('Algo salió mal');
            },
            complete: () => { },
        });
    }

    // ── Helpers ─────────────────────────────────────────────────────────────────
    private closeModal(id: string): void {
        const modalEl = document.getElementById(id);
        if (modalEl) {
            const modal = (window as any).bootstrap.Modal.getInstance(modalEl);
            modal?.hide();
        }
    }
}