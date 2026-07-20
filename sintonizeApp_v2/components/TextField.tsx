import { useState } from "react";
import {
  TextInput,
  StyleSheet,
  View,
  Text,
  KeyboardTypeOptions,
  ReturnKeyTypeOptions,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors } from "../theme/colors";
import { radius, font } from "../theme/tokens";

type Props = {
  label?: string;
  placeholder?: string;
  value: string;
  onChangeText: (v: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  icon?: keyof typeof Ionicons.glyphMap;
  error?: string;
  maxLength?: number;
  editable?: boolean;
  multiline?: boolean;
  returnKeyType?: ReturnKeyTypeOptions;
  onSubmitEditing?: () => void;
};

export function TextField({
  label,
  placeholder,
  value,
  onChangeText,
  secureTextEntry,
  keyboardType = "default",
  autoCapitalize = "sentences",
  icon,
  error,
  maxLength,
  editable = true,
  multiline = false,
  returnKeyType,
  onSubmitEditing,
}: Props) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(!!secureTextEntry);

  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <View
        style={[
          styles.field,
          focused && styles.fieldFocused,
          !!error && styles.fieldError,
          !editable && styles.fieldDisabled,
          multiline && styles.fieldMultiline,
        ]}
      >
        {icon ? (
          <Ionicons
            name={icon}
            size={18}
            color={focused ? colors.primary : colors.subtle}
            style={styles.leftIcon}
          />
        ) : null}

        <TextInput
          style={[styles.input, multiline && styles.inputMultiline]}
          placeholder={placeholder}
          placeholderTextColor={colors.subtle}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={hidden}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          maxLength={maxLength}
          editable={editable}
          multiline={multiline}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />

        {secureTextEntry ? (
          <Ionicons
            name={hidden ? "eye-off-outline" : "eye-outline"}
            size={20}
            color={colors.subtle}
            onPress={() => setHidden((h) => !h)}
            style={styles.rightIcon}
          />
        ) : null}
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 16 },
  label: {
    marginBottom: 7,
    color: colors.text,
    fontSize: font.size.sm,
    fontWeight: font.weight.medium,
  },
  field: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
  },
  fieldMultiline: { alignItems: "flex-start", paddingVertical: 6 },
  fieldFocused: {
    borderColor: colors.primary,
    backgroundColor: "#FFFFFF",
    shadowColor: colors.primary,
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  fieldError: { borderColor: colors.danger },
  fieldDisabled: { backgroundColor: colors.bgSoft, opacity: 0.8 },
  leftIcon: { marginRight: 10 },
  rightIcon: { marginLeft: 8, padding: 2 },
  input: {
    flex: 1,
    paddingVertical: 13,
    fontSize: font.size.md,
    color: colors.textStrong,
  },
  inputMultiline: { minHeight: 90, textAlignVertical: "top" },
  errorText: {
    marginTop: 5,
    color: colors.danger,
    fontSize: font.size.xs,
    fontWeight: font.weight.medium,
  },
});
