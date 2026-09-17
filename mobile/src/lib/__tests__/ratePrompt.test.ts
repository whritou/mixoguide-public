const mockGetItemAsync = jest.fn()
const mockSetItemAsync = jest.fn()
const mockShowGlobalActionDialog = jest.fn()
const mockAlert = jest.fn()

describe('rate prompt', () => {
    beforeEach(() => {
        jest.resetModules()
        jest.clearAllMocks()
        jest.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

        jest.doMock('expo-secure-store', () => ({
            getItemAsync: mockGetItemAsync,
            setItemAsync: mockSetItemAsync,
        }))

        jest.doMock('@/components/ui/ActionDialog', () => ({
            showGlobalActionDialog: mockShowGlobalActionDialog,
        }))

        jest.doMock('react-native', () => ({
            Alert: { alert: mockAlert },
            Linking: {
                canOpenURL: jest.fn(),
                openURL: jest.fn(),
            },
            Platform: { OS: 'android' },
        }))
    })

    afterEach(() => {
        jest.restoreAllMocks()
    })

    it('shows the branded action dialog when rating prompt is due', async () => {
        const { Alert } = require('react-native')
        const { noteRatePromptEligibleAction } = require('../ratePrompt')
        const { RATE_PROMPT_RULES } = require('../ratePromptPolicy')

        mockGetItemAsync.mockResolvedValueOnce(JSON.stringify({
            firstActionAt: 1_699_999_000_000,
            actionCount: RATE_PROMPT_RULES.minActionsBeforeFirstPrompt - 1,
            nextEligibleActionCount: RATE_PROMPT_RULES.minActionsBeforeFirstPrompt,
            lastPromptAt: null,
            promptCount: 0,
            optedOut: false,
        }))

        await noteRatePromptEligibleAction()

        expect(mockShowGlobalActionDialog).toHaveBeenCalledWith(expect.objectContaining({
            title: 'Enjoying MixoGuide?',
            confirmLabel: 'Rate MixoGuide',
        }))
        expect(Alert.alert).not.toHaveBeenCalled()
    })
})
