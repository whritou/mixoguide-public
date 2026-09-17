const DAY_MS = 24 * 60 * 60 * 1000

export const RATE_PROMPT_RULES = {
    minActionsBeforeFirstPrompt: 4,
    minDaysBetweenPrompts: 60,
    actionsBetweenPrompts: 18,
    maxPrompts: 2,
} as const

export type RatePromptState = {
    firstActionAt: number | null
    actionCount: number
    nextEligibleActionCount: number
    lastPromptAt: number | null
    promptCount: number
    optedOut: boolean
}

export const DEFAULT_RATE_PROMPT_STATE: RatePromptState = {
    firstActionAt: null,
    actionCount: 0,
    nextEligibleActionCount: RATE_PROMPT_RULES.minActionsBeforeFirstPrompt,
    lastPromptAt: null,
    promptCount: 0,
    optedOut: false,
}

export function normalizeRatePromptState(raw: unknown): RatePromptState {
    if (!raw || typeof raw !== 'object') return { ...DEFAULT_RATE_PROMPT_STATE }

    const candidate = raw as Partial<RatePromptState>
    const state: RatePromptState = {
        firstActionAt: typeof candidate.firstActionAt === 'number' ? candidate.firstActionAt : null,
        actionCount: typeof candidate.actionCount === 'number' ? Math.max(0, candidate.actionCount) : 0,
        nextEligibleActionCount: typeof candidate.nextEligibleActionCount === 'number'
            ? Math.max(1, candidate.nextEligibleActionCount)
            : RATE_PROMPT_RULES.minActionsBeforeFirstPrompt,
        lastPromptAt: typeof candidate.lastPromptAt === 'number' ? candidate.lastPromptAt : null,
        promptCount: typeof candidate.promptCount === 'number' ? Math.max(0, candidate.promptCount) : 0,
        optedOut: candidate.optedOut === true,
    }

    if (state.nextEligibleActionCount < RATE_PROMPT_RULES.minActionsBeforeFirstPrompt) {
        state.nextEligibleActionCount = RATE_PROMPT_RULES.minActionsBeforeFirstPrompt
    }

    return state
}

export function applyPositiveAction(state: RatePromptState, nowMs: number): RatePromptState {
    return {
        ...state,
        firstActionAt: state.firstActionAt ?? nowMs,
        actionCount: state.actionCount + 1,
    }
}

export function shouldPromptForRating(state: RatePromptState, nowMs: number): boolean {
    if (state.optedOut) return false
    if (state.promptCount >= RATE_PROMPT_RULES.maxPrompts) return false
    if (state.actionCount < state.nextEligibleActionCount) return false
    if (!state.firstActionAt) return false

    if (state.lastPromptAt) {
        const sinceLastPromptMs = nowMs - state.lastPromptAt
        if (sinceLastPromptMs < RATE_PROMPT_RULES.minDaysBetweenPrompts * DAY_MS) return false
    }

    return true
}

export function schedulePrompt(state: RatePromptState, nowMs: number): RatePromptState {
    return {
        ...state,
        promptCount: state.promptCount + 1,
        lastPromptAt: nowMs,
        nextEligibleActionCount: state.actionCount + RATE_PROMPT_RULES.actionsBetweenPrompts,
    }
}
