export interface Tournament {
    id: number,
    name: string,
    status: string,
    start_date: string,
    end_date: string,
    location: string,
    teams_registered: number
}

export interface CreateTournament {
    id: number
    sport_id: number,
    name: string,
    description: string,
    format: string,
    start_date: string,
    end_date: string,
    location: string
}
export interface EditTournament {
    id: number
    name: string,
    start_date: string
}

export interface RegisteredTeam {
    team_id: number,
    seed: number,
    inscription_status: string,
    team_name: string,
}

export interface Standings {
    team_id: number,
    team_name: string,
    short_name: string,
    group_name: string,
    played: number,
    won: number,
    drawn: number,
    lost: number,
    points: number,
    goals_for: number,
    goals_against: number,
    goal_diff: number,
    sport_stats: any,
    updated_at: "2026-04-19T18:24:04.000Z"
}