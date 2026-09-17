import { View, TouchableOpacity, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

interface Props {
    value:    number | null
    onChange: (rating: number) => void
    disabled?: boolean
    size?:    number
}

export function RatingWidget({ value, onChange, disabled, size = 28 }: Props) {
    return (
        <View style={s.row}>
            {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                    key={star}
                    onPress={() => !disabled && onChange(star === value ? 0 : star)}
                    hitSlop={4}
                    disabled={disabled}
                >
                    <Ionicons
                        name={star <= (value ?? 0) ? 'star' : 'star-outline'}
                        size={size}
                        color={star <= (value ?? 0) ? '#f59e0b' : '#d1d5db'}
                    />
                </TouchableOpacity>
            ))}
        </View>
    )
}

const s = StyleSheet.create({
    row: { flexDirection: 'row', gap: 4 },
})
