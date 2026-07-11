import React, { useMemo, useState } from "react";
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
import { TranslationApiClient } from "../api/translationClient";
import { apiConfig } from "../config/api";

export function TranslatorScreen() {
  const client = useMemo(
    () => new TranslationApiClient(apiConfig.baseUrl, apiConfig.username, apiConfig.password),
    [],
  );
  const [text, setText] = useState("");
  const [translation, setTranslation] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function translate() {
    const input = text.trim();
    if (!input) return setError("Enter some English text first.");
    setLoading(true);
    setError("");
    setTranslation("");
    try {
      const result = await client.translate(input);
      setTranslation(result.translation);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Translation failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
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
