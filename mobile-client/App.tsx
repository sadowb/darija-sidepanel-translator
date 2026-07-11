import { StatusBar } from "expo-status-bar";
import React from "react";
import { TranslatorScreen } from "./src/screens/TranslatorScreen";

export default function App() {
  return (
    <>
      <StatusBar style="dark" />
      <TranslatorScreen />
    </>
  );
}
