export interface Team {
    id: number,
    name: string,
    short_name: string,
    logo_url: string,
    contact_email: string,
    contact_phone: string,
    coach: string
    created_at: string,
    tournaments_played: number
}


export interface EditTeam {
    id: number
    name: string,
    short_name: string,
    logo_url: string,
    contact_email: string,
    contact_phone: string,
    coach: string
}

export interface CreateTeam {
    id: number
    name: string,
    short_name: string,
    logo_url: string,
    contact_email: string,
    contact_phone: string,
    coach: string
}
