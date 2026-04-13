import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { AuthColors, Fonts } from '@/constants/theme';
import { useGameStore } from '@/store/gameStore';

interface CoreAttributesModalProps {
  visible: boolean;
  onClose: () => void;
}

export function CoreAttributesModal({ visible, onClose }: CoreAttributesModalProps) {
  const avatar = useGameStore((s) => s.avatar);
  const baseDmg = Math.round(10 * (1 + (Number(avatar?.stats?.strength || 10) + Number(avatar?.stats?.agility || 10) + Number(avatar?.stats?.stamina || 10)) / 100));

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalBg}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>CORE ATTRIBUTES</Text>
          <Text style={styles.dmgRepText}>
            Base Dmg/Rep: {baseDmg}
          </Text>
          
          <View style={styles.attrModalRow}>
            <Text style={styles.attrModalLabel}>• STR (STRENGTH)</Text>
            <Text style={styles.attrModalDesc}>+1% DMG per STR. Trained by doing Push-Ups, Pull-Ups, & Leveling Up.</Text>
          </View>

          <View style={styles.attrModalRow}>
            <Text style={styles.attrModalLabel}>• AGI (AGILITY)</Text>
            <Text style={styles.attrModalDesc}>+1% DMG per AGI. Trained by doing Squats & Leveling Up.</Text>
          </View>

          <View style={styles.attrModalRow}>
            <Text style={styles.attrModalLabel}>• STA (STAMINA)</Text>
            <Text style={styles.attrModalDesc}>+1% DMG per STA. Trained by doing Sit-Ups, defeating Enemies, & Leveling Up.</Text>
          </View>

          <TouchableOpacity style={styles.modalBtn} onPress={onClose}>
            <Text style={styles.modalBtnText}>CLOSE</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalCard: { width: '100%', backgroundColor: '#FFFFFF', borderWidth: 4, borderColor: AuthColors.navy, padding: 20, shadowColor: AuthColors.navy, shadowOffset: { width: 6, height: 6 }, shadowOpacity: 1, shadowRadius: 0, elevation: 6 },
  modalTitle: { fontFamily: Fonts.pixel, fontSize: 24, color: AuthColors.navy, textAlign: 'center', marginBottom: 24 },
  dmgRepText: { textAlign: 'center', fontFamily: Fonts.pixel, fontSize: 16, color: '#64748B', marginTop: -16, marginBottom: 24 },
  attrModalRow: { marginBottom: 16, backgroundColor: '#F8FAFC', borderWidth: 2, borderColor: '#CBD5E1', padding: 12 },
  attrModalLabel: { fontFamily: Fonts.vt323, fontSize: 20, color: AuthColors.crimson, marginBottom: 4 },
  attrModalDesc: { fontFamily: Fonts.vt323, fontSize: 18, color: '#3D494C' },
  modalBtn: { backgroundColor: AuthColors.navy, paddingVertical: 12, alignItems: 'center', marginTop: 12, borderWidth: 2, borderColor: '#FFFFFF' },
  modalBtnText: { fontFamily: Fonts.pixel, fontSize: 16, color: '#FFFFFF' }
});
