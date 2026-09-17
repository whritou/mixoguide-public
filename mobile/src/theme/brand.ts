import { Platform } from 'react-native'

export const C = {
    bronze:      '#7a5830',
    bronzeLight: '#bc9366',
    cream:       '#fbf9f6',
    creamWarm:   '#f5ece0',
    ink:         '#1b1c1a',
    mute:        '#81756a',
    border:      '#e4e2df',
    borderWarm:  '#d3c4b7',
    amber:       '#f2e6d2',
    card:        '#ffffff',
    heroDark:    '#1e1610',
}

export const F = {
    head: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    mono: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
}

export const TONES: Record<string, string> = {
    amber:  '#e8c590',
    rose:   '#e9b8a4',
    citrus: '#ecd680',
    deep:   '#5c3e2a',
    pale:   '#efe2cf',
    green:  '#cad9b3',
}

const TONE_KEYS = ['amber', 'rose', 'pale', 'green', 'citrus', 'deep']

export function toneForId(id: string): string {
    const sum = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
    return TONES[TONE_KEYS[sum % TONE_KEYS.length]]
}
