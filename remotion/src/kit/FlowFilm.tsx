/**
 * FlowFilm — the skeleton every flow video is declared against.
 *
 * A film is an optional title card, a run of scenes, and an end card. The
 * phone enters ONCE and stays put while the screens inside it cross-dissolve,
 * which reads as one continuous session rather than ten separate shots.
 *
 * Each scene's children get frame 0 at its own start (they're wrapped in a
 * Sequence), so a scene can animate taps and counters without knowing where
 * it sits in the timeline. Scenes are mounted `OVERLAP` frames past their own
 * end and the incoming screen fades in on top, giving a real dissolve instead
 * of a one-frame cut to an empty device.
 */
import React from 'react';
import { Sequence, interpolate, useCurrentFrame } from 'remotion';
import { CANVAS } from '../brand/tokens';
import { Backdrop, Caption, EndCard, StageHeader, StagePhone, TitleCard } from './Stage';

/**
 * Frames the outgoing screen stays mounted under the incoming one.
 *
 * Kept short on purpose: two dense UI screens blended for a third of a second
 * read as a ghosted double exposure rather than a transition. At 6 frames
 * (200ms) the same crossfade reads as a clean cut.
 */
const OVERLAP = 6;

export interface Scene {
    /** Length in frames (30fps). */
    dur: number;
    /** Phone content for this beat. */
    screen: React.ReactNode;
    /** Small gold step label above the caption. */
    eyebrow?: string;
    /** The one line the viewer reads. */
    caption: string;
}

export interface FilmSpec {
    title?: { kicker?: string; title: string; sub?: string };
    titleDur?: number;
    scenes: Scene[];
    end?: { line?: string };
    endDur?: number;
}

/** Total length of a film — used to declare each Composition's duration. */
export const filmDuration = (spec: FilmSpec) =>
    (spec.title ? (spec.titleDur ?? 62) : 0) +
    spec.scenes.reduce((a, s) => a + s.dur, 0) +
    (spec.end === undefined ? 58 : (spec.endDur ?? 58));

/** Fades a screen in over its first 10 frames (the dissolve). */
const ScreenFade: React.FC<{ children: React.ReactNode; first: boolean }> = ({ children, first }) => {
    const frame = useCurrentFrame();
    const opacity = first
        ? 1
        : interpolate(frame, [0, OVERLAP], [0, 1], { extrapolateRight: 'clamp' });
    return (
        <div style={{ position: 'absolute', inset: 0, opacity }}>
            {children}
        </div>
    );
};

export const FlowFilm: React.FC<{ spec: FilmSpec }> = ({ spec }) => {
    const titleDur = spec.title ? (spec.titleDur ?? 62) : 0;
    const endDur = spec.end === undefined ? 58 : (spec.endDur ?? 58);
    const scenesTotal = spec.scenes.reduce((a, s) => a + s.dur, 0);

    // Absolute start frame of each scene, relative to the scenes block.
    const starts: number[] = [];
    let acc = 0;
    for (const s of spec.scenes) {
        starts.push(acc);
        acc += s.dur;
    }

    return (
        <Backdrop>
            {spec.title && (
                <Sequence durationInFrames={titleDur + OVERLAP}>
                    <TitleCard {...spec.title} />
                </Sequence>
            )}

            <Sequence from={titleDur} durationInFrames={scenesTotal + OVERLAP}>
                <StageHeader />
                <StagePhone>
                    {spec.scenes.map((s, i) => (
                        <Sequence
                            key={i}
                            from={starts[i]}
                            // Linger past its own end so the next screen can
                            // dissolve over it rather than over bare metal.
                            durationInFrames={s.dur + OVERLAP}
                            layout="none"
                        >
                            <ScreenFade first={i === 0}>{s.screen}</ScreenFade>
                        </Sequence>
                    ))}
                </StagePhone>

                {spec.scenes.map((s, i) => (
                    <Sequence key={i} from={starts[i]} durationInFrames={s.dur} layout="none">
                        <Caption eyebrow={s.eyebrow} text={s.caption} />
                    </Sequence>
                ))}
            </Sequence>

            {endDur > 0 && (
                <Sequence from={titleDur + scenesTotal} durationInFrames={endDur}>
                    <EndCard line={spec.end?.line} />
                </Sequence>
            )}
        </Backdrop>
    );
};

/**
 * Binds a spec into a standalone component.
 *
 * Specs hold React elements, and Remotion serializes a Composition's
 * `defaultProps` — passing one as a prop strips `$$typeof` off those elements
 * and React then rejects them as plain objects. Closing over the spec keeps
 * them intact, and the component identity is stable across renders.
 */
export const makeFilm = (spec: FilmSpec): React.FC => {
    const Film: React.FC = () => <FlowFilm spec={spec} />;
    return Film;
};

/** Registered dimensions, shared by every composition. */
export const COMP = {
    width: CANVAS.width,
    height: CANVAS.height,
    fps: CANVAS.fps,
} as const;
