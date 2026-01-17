import React, { useState } from "react";
import { View, StyleSheet, TextInput, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";

export default function LoginScreen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = () => {};

  return (
    <>
      <SafeAreaView style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text style={styles.title}>Willkommen zurück</Text>
        <Text style={styles.subtitle}>Bitte melden Sie sich an, um fortzufahren</Text>

        <View style={styles.card}>
          <Text style={styles.fieldLabel}>E-Mail</Text>

          <View style={styles.inputRow}>
            <MaterialIcons name="person-outline" size={22} />
            <TextInput placeholder="Username" value={username} onChangeText={setUsername} style={styles.input} />
          </View>
          <Text style={styles.fieldLabel}>Passwort</Text>

          <View style={styles.inputRow}>
            <MaterialIcons name="lock-outline" size={22} />
            <TextInput
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              style={styles.input}
            />
          </View>
          <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
            <Text style={styles.loginButtonText}>Anmelden</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {},

  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 4,
  },
  input: {},

  title: { fontSize: 22, fontWeight: "700", color: "#1268B0", marginBottom: 6, textAlign: "center" },
  subtitle: { fontSize: 14, color: "#6b6b6b", marginBottom: 20, textAlign: "center" },

  fieldLabel: { alignSelf: "flex-start", color: "#1268B0", fontWeight: "600", marginBottom: 6, fontSize: 14 },

  inputRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f6f6f6",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  loginButton: {
    width: "100%",
    backgroundColor: "#1268B0",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 12,
  },
  loginButtonText: { color: "#fff", fontSize: 17, fontWeight: "600", letterSpacing: 0.5 },
});
