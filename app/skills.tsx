import React from 'react';
import { useRouter } from 'expo-router';
import SkillsScreen from '@/screens/SkillsScreen';

export default function SkillsRoute() {
  const router = useRouter();

  return <SkillsScreen />;
}
