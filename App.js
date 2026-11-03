// App.js
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import ChatInterface from './src/components/ChatInterface';

export default function App() {
  return (
    <>
      <StatusBar style="light" />
      <ChatInterface />
    </>
  );
}
