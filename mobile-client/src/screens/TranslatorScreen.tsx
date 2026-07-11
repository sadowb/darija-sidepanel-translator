import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import * as Speech from "expo-speech";
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from "expo-speech-recognition";
import { TranslationApiClient } from "../api/translationClient";
import { MobileSettings, SettingsStore } from "../storage/settings-store";

const defaultSettings: MobileSettings = {
  apiUrl: "https://darija-sidepanel-translator-production.up.railway.app",
  username: "translator",
  password: "Black",
  llmApiKey: "",
  autoTranslate: true,
};

function formatCount(value: number) {
  return value.toLocaleString();
}

function normalizeText(value: string) {
  return value.trim();
}

function canReadAloud() {
  return Platform.OS === "web" && typeof window !== "undefined" && "speechSynthesis" in window;
}

export function TranslatorScreen() {
  const [screen, setScreen] = useState<"loading" | "onboarding" | "translator">("loading");
  const [apiUrl, setApiUrl] = useState(defaultSettings.apiUrl);
  const [username, setUsername] = useState(defaultSettings.username);
  const [password, setPassword] = useState(defaultSettings.password);
  const [llmApiKey, setLlmApiKey] = useState(defaultSettings.llmApiKey);
  const [autoTranslate, setAutoTranslate] = useState(defaultSettings.autoTranslate);
  const [connectionText, setConnectionText] = useState("Checking…");
  const [connectionHealthy, setConnectionHealthy] = useState(false);
  const [onboardStatus, setOnboardStatus] = useState("");
  const [text, setText] = useState("");
  const [translation, setTranslation] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copyLabel, setCopyLabel] = useState("📋 Copy");
  const [listening, setListening] = useState(false);
  const latestTextRef = useRef("");
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const client = useMemo(
    () => new TranslationApiClient(apiUrl, username, password, llmApiKey),
    [apiUrl, username, password, llmApiKey],
  );

  useEffect(() => {
    latestTextRef.current = text;
  }, [text]);

  async function translateInput(input: string) {
    const normalizedInput = input.trim();
    if (!normalizedInput) {
      setError("Enter some English text first.");
      return;
    }

    setLoading(true);
    setError("");
    setTranslation("");

    try {
      const result = await client.translate(normalizedInput);
      setTranslation(result.translation);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Translation failed.");
    } finally {
      setLoading(false);
    }
  }

  useSpeechRecognitionEvent("start", () => {
    setListening(true);
    setError("");
  });

  useSpeechRecognitionEvent("end", () => {
    setListening(false);
  });

  useSpeechRecognitionEvent("error", (event) => {
    setListening(false);

    if (event.error === "not-allowed") {
      setError("Microphone permission blocked. Enable microphone and speech recognition access in system settings.");
      return;
    }

    if (event.error === "service-not-allowed") {
      setError("Speech recognition is not available on this device. Enable dictation or speech recognition in settings.");
      return;
    }

    setError(event.message ? `Voice input error: ${event.message}` : `Voice input error: ${event.error}`);
  });

  useSpeechRecognitionEvent("result", (event) => {
    const transcript = event.results[0]?.transcript?.trim();
    if (!transcript) {
      return;
    }

    const nextText = `${latestTextRef.current} ${transcript}`.trim();
    latestTextRef.current = nextText;
    setText(nextText);

    if (autoTranslate) {
      void translateInput(nextText);
    }
  });

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      const saved = await SettingsStore.get();
      if (!active) {
        return;
      }

      setApiUrl(saved.apiUrl || defaultSettings.apiUrl);
      setUsername(saved.username || defaultSettings.username);
      setPassword(saved.password || defaultSettings.password);
      setLlmApiKey(saved.llmApiKey || "");
      setAutoTranslate(Boolean(saved.autoTranslate));

      if (!saved.apiUrl || !saved.username || !saved.password) {
        setConnectionHealthy(false);
        setConnectionText("Offline");
        setScreen("onboarding");
        return;
      }

      setConnectionText("Connecting…");
      try {
        await new TranslationApiClient(saved.apiUrl, saved.username, saved.password, saved.llmApiKey).health();
        if (!active) {
          return;
        }
        setConnectionHealthy(true);
        setConnectionText("Connected");
        setScreen("translator");
      } catch {
        if (!active) {
          return;
        }
        setConnectionHealthy(false);
        setConnectionText("Offline");
        setOnboardStatus("Could not reach the server. Check the URL and credentials.");
        setScreen("onboarding");
      }
    }

    bootstrap().catch(() => {
      if (active) {
        setOnboardStatus("Could not initialize the app.");
        setScreen("onboarding");
      }
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      try {
        ExpoSpeechRecognitionModule.abort();
      } catch {
        // no-op
      }

      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
      }

      if (canReadAloud()) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  async function saveConnection(nextSettings: MobileSettings) {
    await SettingsStore.save(nextSettings);
    setApiUrl(nextSettings.apiUrl);
    setUsername(nextSettings.username);
    setPassword(nextSettings.password);
    setLlmApiKey(nextSettings.llmApiKey);
    setAutoTranslate(nextSettings.autoTranslate);
  }

  async function verifyAndConnect() {
    const normalizedApiUrl = normalizeText(apiUrl).replace(/\/$/, "");
    const normalizedUsername = normalizeText(username);
    const nextSettings: MobileSettings = {
      apiUrl: normalizedApiUrl,
      username: normalizedUsername,
      password,
      llmApiKey: llmApiKey.trim(),
      autoTranslate,
    };

    setOnboardStatus("Testing connection…");
    try {
      const onboardingClient = new TranslationApiClient(
        nextSettings.apiUrl,
        nextSettings.username,
        nextSettings.password,
        nextSettings.llmApiKey,
      );
      await onboardingClient.health();
      await saveConnection(nextSettings);
      setConnectionHealthy(true);
      setConnectionText("Connected");
      setOnboardStatus("");
      setScreen("translator");
    } catch {
      setConnectionHealthy(false);
      setConnectionText("Offline");
      setOnboardStatus("Connection failed. Verify URL and credentials.");
      setScreen("onboarding");
    }
  }

  async function disconnect() {
    await SettingsStore.clear();
    setApiUrl(defaultSettings.apiUrl);
    setUsername(defaultSettings.username);
    setPassword(defaultSettings.password);
    setLlmApiKey("");
    setAutoTranslate(true);
    setText("");
    latestTextRef.current = "";
    setTranslation("");
    setError("");
    setConnectionHealthy(false);
    setConnectionText("Offline");
    setOnboardStatus("");
    setScreen("onboarding");
  }

  async function translate() {
    await translateInput(text);
  }

  async function copyTranslation() {
    if (!translation) {
      return;
    }

    try {
      await Clipboard.setStringAsync(translation);
      setCopyLabel("✓ Copied!");
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
      }
      copyTimerRef.current = setTimeout(() => setCopyLabel("📋 Copy"), 1500);
    } catch {
      if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(translation);
          setCopyLabel("✓ Copied!");
          if (copyTimerRef.current) {
            clearTimeout(copyTimerRef.current);
          }
          copyTimerRef.current = setTimeout(() => setCopyLabel("📋 Copy"), 1500);
          return;
        } catch {
          // fall through
        }
      }

      setError("Could not copy the translation.");
    }
  }

  function speakTranslation() {
    if (!translation) {
      return;
    }

    if (canReadAloud()) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(translation);
      utterance.lang = "ar-MA";
      window.speechSynthesis.speak(utterance);
      return;
    }

    Speech.stop();
    Speech.speak(translation, { language: "ar-MA" });
  }

  async function handleVoicePress() {
    if (listening) {
      ExpoSpeechRecognitionModule.stop();
      return;
    }

    setError("");

    try {
      const permission = await ExpoSpeechRecognitionModule.requestMicrophonePermissionsAsync();
      if (!permission.granted) {
        setError("Microphone permission blocked. Enable microphone access in system settings.");
        return;
      }

      if (!ExpoSpeechRecognitionModule.isRecognitionAvailable()) {
        setError("Speech recognition is not available on this device. Enable dictation or speech recognition in settings.");
        return;
      }

      ExpoSpeechRecognitionModule.start({
        lang: "en-US",
        continuous: false,
        interimResults: false,
        requiresOnDeviceRecognition: true,
      });
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Could not start microphone.";
      setError(message.includes("network") ? "Voice recognition could not reach the service. Try again with a stronger connection or install the language pack for on-device recognition." : message);
    }
  }

  if (screen === "loading") {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingScreen}>
          <ActivityIndicator color="#2563eb" />
          <Text style={styles.loadingText}>Checking your connection…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (screen === "onboarding") {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.onboardingPanel} keyboardShouldPersistTaps="handled">
          <View style={styles.brandBlock}>
            <View style={styles.logoMark}>
              <Text style={styles.logoMarkText}>DT</Text>
            </View>
            <Text style={styles.brandTitle}>Darija Translator</Text>
            <Text style={styles.tagline}>Translate English to Moroccan Darija instantly. Connect your account to get started.</Text>
          </View>

          <View style={styles.securityBadge}>
            <Text style={styles.lockIcon}>🔒</Text>
            <Text style={styles.securityText}>
              Your credentials are stored locally and encrypted in transit via HTTPS. Passwords are hashed with BCrypt.
            </Text>
          </View>

          <View style={styles.formField}>
            <Text style={styles.label}>Server URL</Text>
            <TextInput
              style={styles.input}
              value={apiUrl}
              onChangeText={setApiUrl}
              placeholder="https://your-app.up.railway.app"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
          </View>

          <View style={styles.formField}>
            <Text style={styles.label}>Username</Text>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              placeholder="Enter your username"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.formField}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.formField}>
            <Text style={styles.label}>Groq API Key</Text>
            <TextInput
              style={styles.input}
              value={llmApiKey}
              onChangeText={setLlmApiKey}
              placeholder="gsk_... (optional)"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={styles.fieldHint}>Leave empty to use the server's default key.</Text>
          </View>

          <Text style={[styles.statusMsg, onboardStatus ? styles.statusMsgVisible : null, styles.statusMsgCenter, connectionHealthy ? styles.statusConnecting : styles.statusError]}>
            {onboardStatus}
          </Text>

          <TouchableOpacity style={styles.connectButton} onPress={verifyAndConnect}>
            <Text style={styles.connectButtonText}>Sign In & Connect</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.translatorPanel} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.translatorHeader}>
          <View style={styles.brandRow}>
            <View style={styles.logoMarkSmall}>
              <Text style={styles.logoMarkSmallText}>DT</Text>
            </View>
            <View>
              <Text style={styles.eyebrow}>Moroccan Darija</Text>
              <Text style={styles.title}>English → Darija</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.disconnectButton} onPress={disconnect}>
            <Text style={styles.disconnectButtonText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statusPill}>
          <View style={[styles.statusDot, connectionHealthy ? styles.statusDotConnected : null]} />
          <Text style={styles.statusPillText}>{connectionText}</Text>
        </View>

        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.inputSection}>
          <View style={styles.sectionLabel}>
            <Text style={styles.sectionLabelText}>English</Text>
            <Text style={styles.charCount}>{formatCount(text.length)} / 5,000</Text>
          </View>
          <TextInput
            style={styles.textArea}
            value={text}
            onChangeText={setText}
            placeholder="Type or paste English text here…"
            multiline
            maxLength={5000}
            editable={!loading}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.actionBar}>
          <TouchableOpacity style={[styles.primaryButton, styles.flexButton]} onPress={translate} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Translate</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={handleVoicePress}>
            <Text style={styles.secondaryButtonText}>{listening ? "🛑 Listening…" : "🎤 Voice"}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => { setText(""); latestTextRef.current = ""; setTranslation(""); setError(""); }}>
            <Text style={styles.secondaryButtonText}>Clear</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingIndicator}>
            <ActivityIndicator color="#2563eb" />
            <Text style={styles.loadingIndicatorText}>Translating…</Text>
          </View>
        ) : null}

        {translation ? (
          <View style={styles.resultCard}>
            <View style={styles.resultHeader}>
              <Text style={styles.resultHeaderLeft}>Darija</Text>
              <Text style={styles.resultHeaderRight}>الدارجة</Text>
            </View>
            <View style={styles.resultBody}>
              <Text style={styles.translationText}>{translation}</Text>
            </View>
            <View style={styles.resultActions}>
              <TouchableOpacity style={styles.actionButton} onPress={copyTranslation}>
                <Text style={styles.actionButtonText}>{copyLabel}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton} onPress={speakTranslation}>
                <Text style={styles.actionButtonText}>🔊 Read aloud</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  loadingScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#f8fafc",
    gap: 12,
  },
  loadingText: {
    color: "#475569",
    fontSize: 15,
    fontWeight: "500",
  },
  onboardingPanel: {
    flexGrow: 1,
    padding: 24,
    backgroundColor: "#f8fafc",
  },
  brandBlock: {
    alignItems: "center",
    marginTop: 12,
    marginBottom: 24,
  },
  logoMark: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: "#0f172a",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  logoMarkText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 1,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 6,
  },
  tagline: {
    fontSize: 13,
    color: "#475569",
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 280,
  },
  securityBadge: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    marginBottom: 18,
  },
  lockIcon: {
    fontSize: 14,
    lineHeight: 18,
  },
  securityText: {
    flex: 1,
    color: "#166534",
    fontSize: 12,
    lineHeight: 18,
  },
  formField: {
    marginBottom: 14,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  input: {
    width: "100%",
    minHeight: 42,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#0f172a",
    backgroundColor: "#ffffff",
  },
  fieldHint: {
    fontSize: 11,
    color: "#94a3b8",
    marginTop: 4,
    lineHeight: 16,
  },
  statusMsg: {
    minHeight: 18,
    fontSize: 12,
    marginTop: 2,
    marginBottom: 12,
    opacity: 0,
  },
  statusMsgVisible: {
    opacity: 1,
  },
  statusMsgCenter: {
    textAlign: "center",
  },
  statusError: {
    color: "#dc2626",
  },
  statusConnecting: {
    color: "#475569",
  },
  connectButton: {
    height: 46,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563eb",
    shadowColor: "#2563eb",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  connectButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
  translatorPanel: {
    flex: 1,
    padding: 18,
    backgroundColor: "#ffffff",
  },
  translatorHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    paddingRight: 12,
  },
  logoMarkSmall: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#0f172a",
    alignItems: "center",
    justifyContent: "center",
  },
  logoMarkSmallText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "800",
  },
  eyebrow: {
    color: "#2563eb",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  title: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 20,
  },
  disconnectButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  disconnectButtonText: {
    color: "#475569",
    fontSize: 11,
    fontWeight: "600",
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 16,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: "#94a3b8",
  },
  statusDotConnected: {
    backgroundColor: "#16a34a",
  },
  statusPillText: {
    color: "#475569",
    fontSize: 12,
    fontWeight: "500",
  },
  errorBanner: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    marginBottom: 14,
  },
  errorBannerText: {
    color: "#dc2626",
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 18,
  },
  inputSection: {
    marginBottom: 12,
  },
  sectionLabel: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  sectionLabelText: {
    color: "#0f172a",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  charCount: {
    color: "#94a3b8",
    fontSize: 11,
    fontVariant: ["tabular-nums"],
  },
  textArea: {
    minHeight: 120,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    lineHeight: 22,
    color: "#0f172a",
    backgroundColor: "#ffffff",
  },
  actionBar: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  flexButton: {
    flex: 1,
  },
  primaryButton: {
    minHeight: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563eb",
    shadowColor: "#2563eb",
    shadowOpacity: 0.22,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
  secondaryButton: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
  },
  secondaryButtonText: {
    color: "#475569",
    fontSize: 13,
    fontWeight: "600",
  },
  loadingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  loadingIndicatorText: {
    color: "#475569",
    fontSize: 13,
    fontWeight: "500",
  },
  resultCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#0f172a",
    shadowOpacity: 0.05,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 1,
  },
  resultHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  resultHeaderLeft: {
    color: "#475569",
    fontSize: 13,
    fontWeight: "600",
  },
  resultHeaderRight: {
    color: "#475569",
    fontSize: 13,
    fontWeight: "600",
  },
  resultBody: {
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  translationText: {
    color: "#0f172a",
    fontSize: 22,
    lineHeight: 36,
    textAlign: "right",
    writingDirection: "rtl",
  },
  resultActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    minHeight: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  actionButtonText: {
    color: "#475569",
    fontSize: 12,
    fontWeight: "600",
  },
});
