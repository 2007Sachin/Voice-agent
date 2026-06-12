export type CharacterState = 'idle' | 'speaking' | 'listening' | 'thinking';

interface InterviewerCharacterProps {
  state: CharacterState;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * The animated interviewer. Ambient breathing + aura always run; one
 * state layer (waveform / ripples / orbit) is cross-faded on top. All
 * motion lives in styles/character.css and is transform/opacity only.
 */
export function InterviewerCharacter({ state, size = 'md' }: InterviewerCharacterProps) {
  return (
    <div
      className={`character character--${size}`}
      data-state={state}
      role="img"
      aria-label={`Interviewer is ${state === 'idle' ? 'ready' : state}`}
    >
      <div className="character__aura" aria-hidden="true" />
      <div className="character__ripples" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      <div className="character__orbit" aria-hidden="true">
        <i className="character__mote" />
        <i className="character__mote" />
        <i className="character__mote" />
      </div>
      <div className="character__core" aria-hidden="true" />
      <div className="character__eyes" aria-hidden="true">
        <i className="character__eye" />
        <i className="character__eye" />
      </div>
      <div className="character__wave" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
        <i />
      </div>
    </div>
  );
}
