import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { colors, radii, spacing, typography } from '../../theme/tokens';

type TextFieldProps = TextInputProps & {
  label: string;
  helperText?: string;
  error?: string | null;
  toggleSecure?: boolean;
};

export function TextField({ label, helperText, error, toggleSecure = false, secureTextEntry, style, ...props }: TextFieldProps) {
  const [revealed, setRevealed] = useState(false);
  const isSecure = toggleSecure ? !revealed : secureTextEntry;

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputShell, error ? styles.inputError : null]}>
        <TextInput
          placeholderTextColor={colors.textSoft}
          secureTextEntry={isSecure}
          style={[styles.input, style]}
          {...props}
        />
        {toggleSecure ? (
          <Pressable onPress={() => setRevealed((value) => !value)} style={styles.iconButton}>
            {revealed ? <EyeOff color={colors.textMuted} size={20} /> : <Eye color={colors.textMuted} size={20} />}
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : helperText ? <Text style={styles.helper}>{helperText}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.sm,
  },
  label: {
    fontSize: typography.body,
    color: colors.text,
    fontWeight: '500',
  },
  inputShell: {
    minHeight: 52,
    borderRadius: radii.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputError: {
    borderColor: colors.red,
    backgroundColor: colors.redLight,
  },
  input: {
    flex: 1,
    fontSize: typography.body,
    color: colors.text,
    paddingVertical: spacing.md,
  },
  iconButton: {
    paddingLeft: spacing.md,
  },
  helper: {
    fontSize: typography.small,
    color: colors.textMuted,
  },
  error: {
    fontSize: typography.small,
    color: colors.red,
  },
});
