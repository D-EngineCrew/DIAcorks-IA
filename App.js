// App.js
import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import ChatInterface from './src/components/ChatInterface';

// Si algo de JavaScript falla, en vez de cerrarse la app muestra el error (y permite reintentar)
class ErrorBoundary extends React.Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <View style={{ flex: 1, backgroundColor: '#121212', padding: 24, paddingTop: 60 }}>
        <Text style={{ color: '#ff5470', fontSize: 18, fontWeight: '700' }}>Algo falló</Text>
        <ScrollView style={{ marginVertical: 16 }}>
          <Text style={{ color: '#f2f2f4', fontSize: 13 }} selectable>
            {String((this.state.error && this.state.error.stack) || this.state.error)}
          </Text>
        </ScrollView>
        <TouchableOpacity onPress={() => this.setState({ error: null })}>
          <Text style={{ color: '#00ffcc', fontSize: 16, fontWeight: '600' }}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <StatusBar style="light" />
      <ChatInterface />
    </ErrorBoundary>
  );
}
