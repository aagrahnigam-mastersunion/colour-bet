export type Colour = 'red' | 'yellow' | 'green' | 'blue';
export type AgeBand = 'under_18' | '18-24' | '25-34' | '35+';
export type Gender = 'male' | 'female' | 'prefer_not';
export type ColourVision = 'yes' | 'no' | 'not_sure';
export type DeviceType = 'mobile' | 'tablet' | 'desktop';

export interface QuestionAnswer {
  q: number;
  choice: string; // selected option label, or 'no_response'
  bet: number;
  rt_ms: number;
}

export interface SubmitPayload {
  participant_id: string;
  created_at_client: string;
  colour: Colour;
  name?: string;
  age_band: string;
  gender: string;
  colour_vision: string;
  device_type: DeviceType;
  screen_width_px: number;
  user_agent: string;
  total_time_ms: number;
  questions: QuestionAnswer[];
  honeypot?: string;
}
