import { View, ActivityIndicator, StyleSheet } from 'react-native'
import { C } from '@/theme/brand'

export default function GoogleCallbackScreen() {
    return (
        <View style={s.container}>
            <ActivityIndicator size="large" color={C.bronze} />
        </View>
    )
}

const s = StyleSheet.create({
    container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.cream },
})
