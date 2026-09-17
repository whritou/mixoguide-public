import {
    applyPositiveAction,
    DEFAULT_RATE_PROMPT_STATE,
    RATE_PROMPT_RULES,
    schedulePrompt,
    shouldPromptForRating,
    type RatePromptState,
} from '../ratePromptPolicy'

const DAY_MS = 24 * 60 * 60 * 1000

function buildState(overrides: Partial<RatePromptState> = {}): RatePromptState {
    return {
        ...DEFAULT_RATE_PROMPT_STATE,
        ...overrides,
    }
}

describe('rate prompt policy', () => {
    it('does not prompt before minimum actions', () => {
        const now = Date.now()
        const state = buildState({
            firstActionAt: now - 5 * DAY_MS,
            actionCount: RATE_PROMPT_RULES.minActionsBeforeFirstPrompt - 1,
        })

        expect(shouldPromptForRating(state, now)).toBe(false)
    })

    it('prompts as soon as minimum actions are met', () => {
        const now = Date.now()
        const state = buildState({
            firstActionAt: now - 1 * DAY_MS,
            actionCount: RATE_PROMPT_RULES.minActionsBeforeFirstPrompt,
        })

        expect(shouldPromptForRating(state, now)).toBe(true)
    })

    it('respects cooldown between prompts', () => {
        const now = Date.now()
        const state = buildState({
            firstActionAt: now - 30 * DAY_MS,
            actionCount: RATE_PROMPT_RULES.minActionsBeforeFirstPrompt + RATE_PROMPT_RULES.actionsBetweenPrompts,
            promptCount: 1,
            lastPromptAt: now - (RATE_PROMPT_RULES.minDaysBetweenPrompts - 1) * DAY_MS,
        })

        expect(shouldPromptForRating(state, now)).toBe(false)
    })

    it('does not prompt after opt-out', () => {
        const now = Date.now()
        const state = buildState({
            firstActionAt: now - 3 * DAY_MS,
            actionCount: RATE_PROMPT_RULES.minActionsBeforeFirstPrompt + 10,
            optedOut: true,
        })

        expect(shouldPromptForRating(state, now)).toBe(false)
    })

    it('applies action and schedules next threshold after prompting', () => {
        const now = Date.now()
        const progressed = applyPositiveAction(
            buildState({
                firstActionAt: now - 2 * DAY_MS,
                actionCount: RATE_PROMPT_RULES.minActionsBeforeFirstPrompt - 1,
            }),
            now
        )

        expect(progressed.actionCount).toBe(RATE_PROMPT_RULES.minActionsBeforeFirstPrompt)
        expect(shouldPromptForRating(progressed, now)).toBe(true)

        const scheduled = schedulePrompt(progressed, now)
        expect(scheduled.promptCount).toBe(1)
        expect(scheduled.nextEligibleActionCount).toBe(
            progressed.actionCount + RATE_PROMPT_RULES.actionsBetweenPrompts
        )
    })
})
