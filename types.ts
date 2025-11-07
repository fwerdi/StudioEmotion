
export type EmotionState = 'Engaged' | 'Confused' | 'Neutral' | 'Bored' | 'Happy' | 'Analyzing...' | 'Idle' | 'Error';

export interface Participant {
  id: string;
  name: string;
  isHost: boolean;
}
