import { Calendar, FolderOpen, Home, MessageSquare, MoreHorizontal } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, typography } from '../../theme/tokens';

export type NavItem = 'home' | 'records' | 'appointments' | 'messages' | 'more';

type BottomNavProps = {
  active: NavItem;
  onChange: (item: NavItem) => void;
};

const items = [
  { key: 'home', label: 'Home', Icon: Home },
  { key: 'records', label: 'Records', Icon: FolderOpen },
  { key: 'appointments', label: 'Appointments', Icon: Calendar },
  { key: 'messages', label: 'Messages', Icon: MessageSquare },
  { key: 'more', label: 'More', Icon: MoreHorizontal },
] as const;

export function BottomNav({ active, onChange }: BottomNavProps) {
  return (
    <View style={styles.shell}>
      {items.map((item) => {
        const selected = item.key === active;
        return (
          <Pressable key={item.key} onPress={() => onChange(item.key)} style={styles.item}>
            <View style={[styles.iconWrap, selected && styles.iconWrapActive]}>
              <item.Icon color={selected ? colors.teal : colors.textMuted} size={22} strokeWidth={2.25} />
            </View>
            <Text style={[styles.label, selected && styles.labelActive]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: colors.tealLight,
  },
  label: {
    fontSize: typography.tiny,
    color: colors.textMuted,
  },
  labelActive: {
    color: colors.teal,
    fontWeight: '600',
  },
});
