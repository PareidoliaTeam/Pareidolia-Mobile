/*
 * Author: Armando Vega
 * Date Created: 2 March 2026
 * 
 * Last Modified By: Armando Vega
 * Date Last Modified: 13 March 2026
 * 
 * Description: This file defines a custom hook `useDatasetTabContent` 
 * that provides the content for the dataset profiles tab. It includes 
 * an input modal for creating new profiles and a grid layout to display 
 * existing profiles. The hook takes in the list of profiles, a router for
 * navigation, and a handler function for adding new profiles.
 */
import React, { useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';

type Props = {
  visible: boolean;
  title: string;
  message?: string;
  placeholder?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
};

export default function InputModal({ visible, title, message, placeholder, onConfirm, onCancel }: Props) {
  const [value, setValue] = useState('');

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>{title}</Text>
          {message && <Text style={styles.message}>{message}</Text>}
          <TextInput
            style={styles.input}
            placeholder={placeholder}
            onChangeText={setValue}
            value={value}
          />
          <View style={styles.buttons}>
            <TouchableOpacity onPress={onCancel} style={styles.button}>
              <Text>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { onConfirm(value); setValue(''); }} style={styles.button}>
              <Text>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  container: { backgroundColor: 'white', borderRadius: 10, padding: 20, width: '80%' },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  message: { fontSize: 14, marginBottom: 8, color: '#666' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 6, padding: 8, marginBottom: 12 },
  buttons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  button: { padding: 8 },
});