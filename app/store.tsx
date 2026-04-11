import React from 'react';
import { useRouter } from 'expo-router';
import StoreScreen from '@/screens/StoreScreen';

export default function StoreRoute() {
  const router = useRouter();

  return <StoreScreen />;
}
