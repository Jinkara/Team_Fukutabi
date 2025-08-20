// frontend/types.ts　byきたな

export type DetourSuggestion = {
　id?: string;
　name: string;
　description?: string;
　lat: number;
　lng: number;
　distance_km: number;
　duration_min: number;
　rating?: number;
　open_now?: boolean;
　opening_hours?: string;
　parking?: string;
　source: string;
　url?: string;
　photo_url?: string;
　created_at?: string;
　category: "local" | "gourmet" | "event";
　genre: string;
　desc: string;
　eta_min: number;
　distance_m: number;

};
