/**
 * Section « Contrôles » — fermée par défaut, expandable.
 * Switches : dispo, présence, notifs, rappels.
 */
import {
  Bell,
  ChevronDown,
  CircleDot,
  Clock3,
  Radio,
  SlidersHorizontal,
  type LucideIcon,
} from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  Switch,
  Text,
  View,
} from 'react-native';
import { useThemeFlavor } from '../hooks/useThemeFlavor';
import SoftSurface from './ui/SoftSurface';

export type ProfileToggleKey =
  | 'available_for_missions'
  | 'show_online_presence'
  | 'push_enabled'
  | 'reminders_enabled';

export type ProfileToggleState = Record<ProfileToggleKey, boolean>;

type RowDef = {
  key: ProfileToggleKey;
  label: string;
  hint: string;
  icon: LucideIcon;
};

const ROWS: RowDef[] = [
  {
    key: 'available_for_missions',
    label: 'Dispo missions',
    hint: 'Les leads peuvent te solliciter',
    icon: CircleDot,
  },
  {
    key: 'show_online_presence',
    label: 'Présence en ligne',
    hint: '« En ligne » visible si actif',
    icon: Radio,
  },
  {
    key: 'push_enabled',
    label: 'Notifications',
    hint: 'Push & alertes hub (ON par défaut)',
    icon: Bell,
  },
  {
    key: 'reminders_enabled',
    label: 'Rappels',
    hint: 'Deadlines missions & livrables',
    icon: Clock3,
  },
];

interface Props {
  values: ProfileToggleState;
  busyKey: ProfileToggleKey | null;
  onToggle: (key: ProfileToggleKey, next: boolean) => void;
  defaultOpen?: boolean;
}

/** Couleurs switch lisibles (track kaki ON, thumb crème — pas jaune/jaune) */
function switchColors(colors: {
  kaki: string;
  border: string;
  textSecondary: string;
  deep: string;
}) {
  return {
    trackColor: {
      false: Platform.OS === 'ios' ? colors.border : '#3A3428',
      true: colors.kaki,
    } as const,
    thumbColor: Platform.OS === 'android' ? '#F5EDD6' : undefined,
    ios_backgroundColor: colors.border,
  };
}

export default function ProfileToggles({
  values,
  busyKey,
  onToggle,
  defaultOpen = false,
}: Props) {
  const { colors } = useThemeFlavor();
  const [open, setOpen] = useState(defaultOpen);
  const sw = switchColors(colors);

  const activeCount = ROWS.filter((r) => values[r.key]).length;

  return (
    <SoftSurface
      variant="card"
      className="overflow-hidden mb-3"
    >
      <Pressable
        onPress={() => setOpen((o) => !o)}
        className="flex-row items-center px-4 py-3.5 gap-3 active:opacity-90"
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel="Contrôles"
      >
        <View
          style={{
            backgroundColor: colors.deep,
            borderColor: colors.border,
          }}
          className="w-9 h-9 rounded-xl border items-center justify-center"
        >
          <SlidersHorizontal size={16} color={colors.textSecondary} strokeWidth={2.1} />
        </View>
        <View className="flex-1 min-w-0">
          <Text style={{ color: colors.text }} className="font-space text-sm font-bold">
            Contrôles
          </Text>
          <Text
            style={{ color: colors.textSecondary }}
            className="font-inter text-[11px] mt-0.5"
            numberOfLines={1}
          >
            {open
              ? 'Dispo, présence, notifs, rappels'
              : `${activeCount}/${ROWS.length} actifs · appuyer pour gérer`}
          </Text>
        </View>
        <View style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}>
          <ChevronDown size={18} color={colors.textSecondary} strokeWidth={2.2} />
        </View>
      </Pressable>

      {open
        ? ROWS.map((row) => {
            const Icon = row.icon;
            const on = !!values[row.key];
            const busy = busyKey === row.key;
            return (
              <View
                key={row.key}
                className="flex-row items-center px-4 py-3 gap-3"
                style={{
                  borderTopWidth: 1,
                  borderTopColor: colors.border,
                }}
              >
                <View
                  style={{
                    backgroundColor: on ? colors.kaki + '18' : colors.deep,
                    borderColor: on ? colors.kaki + '45' : colors.border,
                  }}
                  className="w-9 h-9 rounded-xl border items-center justify-center"
                >
                  <Icon
                    size={16}
                    color={on ? colors.kaki : colors.textSecondary}
                    strokeWidth={2.1}
                  />
                </View>
                <View className="flex-1 min-w-0">
                  <Text
                    style={{ color: colors.text }}
                    className="font-inter text-[13px] font-semibold"
                  >
                    {row.label}
                  </Text>
                  <Text
                    style={{ color: colors.textSecondary }}
                    className="font-inter text-[10px] mt-0.5"
                    numberOfLines={1}
                  >
                    {row.hint}
                  </Text>
                </View>
                {busy ? (
                  <ActivityIndicator size="small" color={colors.kaki} />
                ) : (
                  <Switch
                    value={on}
                    onValueChange={(v) => onToggle(row.key, v)}
                    trackColor={sw.trackColor}
                    thumbColor={
                      Platform.OS === 'android'
                        ? on
                          ? '#F5EDD6'
                          : '#A39171'
                        : undefined
                    }
                    ios_backgroundColor={sw.ios_backgroundColor}
                  />
                )}
              </View>
            );
          })
        : null}
    </SoftSurface>
  );
}

/** Fenêtre « En ligne » (alignée avec lib/presence ONLINE_WINDOW_MS) */
export const ONLINE_WINDOW_MS = 5 * 60 * 1000;

/**
 * Badge public « En ligne » :
 * - show_online_presence true (défaut ON si null — colonne absente)
 * - last_seen_at dans la fenêtre (heartbeat app active)
 * Si présence explicitement off → jamais visible.
 */
export function isUserOnline(
  showOnline: boolean | null | undefined,
  lastSeenAt: string | null | undefined,
  windowMs = ONLINE_WINDOW_MS
): boolean {
  if (showOnline === false) return false;
  if (!lastSeenAt) return false;
  const t = new Date(lastSeenAt).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t < windowMs;
}
