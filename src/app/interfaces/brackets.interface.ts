export type TournamentStatus = 'pending' | 'in_progress' | 'finished' | 'canceled';
export type MatchStatus = 'scheduled' | 'in_progress' | 'finished' | 'canceled';

// --- Interfaces de apoyo ---

interface BaseTeam {
    team_id: number;
    name: string;
}

/** Equipo que aparece en la lista de pases directos */
interface DirectPassTeam extends BaseTeam {
    short_name: string;
}

/** Equipo dentro de un partido con su puntaje */
interface MatchTeam extends BaseTeam {
    score: number | null;
}

/** Estructura de un enfrentamiento */
export interface Match {
    match_id: number;
    status: MatchStatus;
    home: MatchTeam;
    away: MatchTeam;
    winner_team_id: number | null;
}

/** Estructura de una fase o ronda del torneo */
export interface Round {
    round_id: number;
    name: string;
    round_order: number;
    status: TournamentStatus;
    pases_directos: DirectPassTeam[];
    matches: Match[];
}

// --- Interface Principal ---

export interface TournamentBracket {
    tournament_id: number;
    tournament_name: string;
    sport: string; // Podrías convertirlo en Enum si manejas varios (ej. 'basketball' | 'soccer')
    status: TournamentStatus;
    bracket: Round[];
}