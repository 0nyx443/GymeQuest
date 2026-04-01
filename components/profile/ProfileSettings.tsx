import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, ScrollView, Alert } from 'react-native';
import { AuthColors, Fonts } from '@/constants/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '@/utils/supabase';
import { useGameStore } from '@/store/gameStore';

function PI(props: React.ComponentProps<typeof TextInput>) {
    return (
        <View style={piSt.wrap}>
            <TextInput style={piSt.input} placeholderTextColor="#6B7280" {...props} />
        </View>
    );
}
const piSt = StyleSheet.create({
    wrap: { marginBottom: 20, shadowColor: '#123441', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0, elevation: 4 },
    input: { height: 62, backgroundColor: '#FFFFFF', borderWidth: 3, borderColor: '#123441', paddingHorizontal: 12, fontFamily: Fonts.vt323, fontSize: 24, color: '#123441' },
});

function SexToggle({ value, onChange }: { value: 'male' | 'female'; onChange: (v: 'male' | 'female') => void }) {
    return (
        <View style={stSt.row}>
            {(['male', 'female'] as const).map((v) => (
                <TouchableOpacity key={v} style={[stSt.btn, value === v && stSt.active]} onPress={() => onChange(v)}>
                    <Text style={stSt.text}>{v === 'male' ? 'MALE' : 'FEMALE'}</Text>
                </TouchableOpacity>
            ))}
        </View>
    );
}
const stSt = StyleSheet.create({
    row: { flexDirection: 'row', gap: 8, marginBottom: 20 },
    btn: { flex: 1, height: 48, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 3, borderColor: '#123441', shadowColor: '#123441', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0, elevation: 4 },
    active: { backgroundColor: '#C6E8F8' },
    text: { fontFamily: Fonts.pixel, fontSize: 10, lineHeight: 15, color: '#123441' },
});

function FL({ text }: { text: string }) {
    return <Text style={flSt.label}>{text}</Text>;
}
const flSt = StyleSheet.create({
    label: { fontFamily: Fonts.vt323, fontSize: 20, lineHeight: 28, letterSpacing: 1, textTransform: 'uppercase', color: '#123441' },
});

interface SettingsItemProps {
    icon: keyof typeof MaterialCommunityIcons.glyphMap;
    label: string;
    onPress?: () => void;
}

function SettingsItem({ icon, label, onPress }: SettingsItemProps) {
    return (
        <TouchableOpacity
            style={styles.item}
            activeOpacity={0.7}
            onPress={onPress}
        >
            <View style={styles.itemLeft}>
                <MaterialCommunityIcons name={icon} size={20} color={AuthColors.navy} />
                <Text style={styles.itemLabel}>{label}</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color="#8D99AE" />
        </TouchableOpacity>
    );
}

export function ProfileSettings() {
    const setShowTutorial = useGameStore((s) => s.setShowTutorial);
    const avatar = useGameStore((s) => s.avatar);
    const setAvatar = useGameStore((s) => s.setAvatar);
    const syncProfile = useGameStore((s) => s.syncProfile);

    const [isEditing, setIsEditing] = useState(false);
    const [birthday, setBirthday] = useState(avatar.birthday || '');
    const [sex, setSex] = useState<'male'|'female'>((avatar.sex as 'male'|'female') || 'male');
    const [height, setHeight] = useState(avatar.height_cm ? String(avatar.height_cm) : '');
    const [weight, setWeight] = useState(avatar.weight_kg ? String(avatar.weight_kg) : '');

    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    const handleSave = async () => {
        setAvatar({
            birthday: birthday.trim() || undefined,
            sex: sex,
            height_cm: height ? parseInt(height) : undefined,
            weight_kg: weight ? parseInt(weight) : undefined
        });
        setIsEditing(false);
        try {
            await syncProfile();
        } catch (e: any) {
            Alert.alert("Error Syncing Profile", e.message);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerLabel}>[ PAUSE MENU ]</Text>
                <Text style={styles.headerTitle}>PROFILE</Text>
            </View>

            <View style={styles.list}>
                <SettingsItem icon="help-circle" label="How to Play" onPress={() => setShowTutorial(true)} />
                <SettingsItem icon="human-edit" label="Edit Physical Traits" onPress={() => setIsEditing(true)} />
                <SettingsItem icon="volume-high" label="Audio & Music" />
                <SettingsItem icon="camera" label="Calibrate Camera" />
                <SettingsItem icon="bell" label="Workout Reminders" />
            </View>

            <Modal visible={isEditing} animationType="slide" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.headerLabel}>[ EDIT TRAITS ]</Text>
                            <TouchableOpacity onPress={() => setIsEditing(false)}>
                                <MaterialCommunityIcons name="close" size={24} color={AuthColors.navy} />
                            </TouchableOpacity>
                        </View>
                        
                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll}>
                            <FL text="[ BIRTHDAY ]" />
                            <PI
                                placeholder="YYYY-MM-DD"
                                value={birthday}
                                onChangeText={setBirthday}
                                maxLength={10}
                            />

                            <FL text="[ SEX ]" />
                            <SexToggle value={sex} onChange={setSex} />

                            <FL text="[ HEIGHT (CM) ]" />
                            <PI
                                placeholder="e.g. 175"
                                value={height}
                                onChangeText={setHeight}
                                keyboardType="numeric"
                                maxLength={5}
                            />

                            <FL text="[ WEIGHT (KG) ]" />
                            <PI
                                placeholder="e.g. 70"
                                value={weight}
                                onChangeText={setWeight}
                                keyboardType="numeric"
                                maxLength={5}
                            />

                            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                                <Text style={styles.saveText}>UPDATE PROFILE</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            <TouchableOpacity
                style={styles.logoutButton}
                activeOpacity={0.8}
                onPress={handleLogout}
            >
                <MaterialCommunityIcons name="logout" size={20} color={AuthColors.crimson} />
                <Text style={styles.logoutText}>SAVE & QUIT</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginTop: 16,
        paddingBottom: 40,
    },
    header: {
        marginBottom: 20,
    },
    headerLabel: {
        fontFamily: Fonts.vt323,
        fontSize: 18,
        color: '#3D494C',
        letterSpacing: 2,
    },
    headerTitle: {
        fontFamily: Fonts.pixel,
        fontSize: 28,
        color: AuthColors.crimson,
        marginTop: 4,
    },
    list: {
        gap: 12,
        marginBottom: 32,
    },
    item: {
        backgroundColor: '#FFFFFF',
        borderWidth: 3,
        borderColor: AuthColors.navy,
        padding: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        shadowColor: AuthColors.navy,
        shadowOffset: { width: 4, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 0,
        elevation: 4,
    },
    itemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    itemLabel: {
        fontFamily: Fonts.pixel,
        fontSize: 12,
        color: AuthColors.navy,
    },
    logoutButton: {
        borderWidth: 3,
        borderColor: AuthColors.crimson,
        paddingVertical: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        backgroundColor: '#FFFFFF',
        shadowColor: AuthColors.navy,
        shadowOffset: { width: 4, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 0,
        elevation: 4,
    },
    logoutText: {
        fontFamily: Fonts.pixel,
        fontSize: 14,
        color: AuthColors.crimson,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        width: '100%',
        maxHeight: '85%',
        backgroundColor: '#F3FAFF',
        borderWidth: 4,
        borderColor: AuthColors.navy,
        padding: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalScroll: {
        paddingBottom: 20,
    },
    saveBtn: {
        backgroundColor: '#C6E8F8',
        borderWidth: 3,
        borderColor: AuthColors.navy,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 10,
        shadowColor: AuthColors.navy,
        shadowOffset: { width: 4, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 0,
        elevation: 4,
    },
    saveText: {
        fontFamily: Fonts.pixel,
        fontSize: 14,
        color: AuthColors.navy,
    }
});
