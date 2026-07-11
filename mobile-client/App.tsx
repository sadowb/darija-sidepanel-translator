import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const API_URL = (process.env.EXPO_PUBLIC_API_URL || "http://localhost:8080").replace(/\/$/, "");
const API_USERNAME = process.env.EXPO_PUBLIC_API_USERNAME || "";
const API_PASSWORD = process.env.EXPO_PUBLIC_API_PASSWORD || "";

export default function App() {
  const [text, setText] = useState("");
  const [translation, setTranslation] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function translate() {
    const input = text.trim();
    if (!input) return setError("Enter some English text first.");
    if (!API_USERNAME || !API_PASSWORD) return setError("Configure the API environment variables.");
    setLoading(true);
    setError("");
    setTranslation("");
    try {
      const token = globalThis.btoa(`${API_USERNAME}:${API_PASSWORD}`);
      const response = await fetch(`${API_URL}/api/translate`, {
        method: "POST",
        headers: { Authorization: `Basic ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ text: input }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Translation failed.");
      setTranslation(payload.translation);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Translation failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView style={styles.page} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Text style={styles.eyebrow}>MOROCCAN DARIJA</Text>
        <Text style={styles.title}>English to Darija</Text>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Type English text…"
          multiline
          maxLength={5000}
          editable={!loading}
        />
        <Text style={styles.counter}>{text.length} / 5000</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <TouchableOpacity style={styles.button} onPress={translate} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Translate</Text>}
        </TouchableOpacity>
        {translation ? (
          <View style={styles.result}>
            <Text style={styles.resultLabel}>الدارجة</Text>
            <Text style={styles.translation}>{translation}</Text>
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f6f8fb" },
  page: { flex: 1, padding: 24 },
  eyebrow: { color: "#2563eb", fontSize: 11, fontWeight: "800", letterSpacing: 1.5, marginTop: 18 },
  title: { color: "#172033", fontSize: 28, fontWeight: "700", marginTop: 6, marginBottom: 24 },
  input: { minHeight: 170, backgroundColor: "#fff", borderColor: "#dbe1ea", borderWidth: 1, borderRadius: 12, padding: 14, textAlignVertical: "top", fontSize: 16 },
  counter: { color: "#64748b", textAlign: "right", marginTop: 6 },
  error: { color: "#b42318", backgroundColor: "#fff1f0", padding: 12, marginTop: 12 },
  button: { minHeight: 48, borderRadius: 9, backgroundColor: "#2563eb", alignItems: "center", justifyContent: "center", marginTop: 16 },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  result: { backgroundColor: "#fff", borderRadius: 12, padding: 18, marginTop: 24 },
  resultLabel: { color: "#64748b", marginBottom: 8, textAlign: "right" },
  translation: { color: "#172033", fontSize: 22, lineHeight: 38, textAlign: "right", writingDirection: "rtl" },
});
