/**
 * Kit formulaires premium PIH Pulse — niveau produit (Linear / Instagram / Notion).
 * Thème dynamique via useThemeFlavor. NativeWind + styles focus.
 */
import { ArrowLeft, Check, ChevronRight, type LucideIcon } from 'lucide-react-native';
import { type ReactNode, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  type TextInputProps,
  View,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeFlavor } from '../../../hooks/useThemeFlavor';

/* ─── Shell ─────────────────────────────────────────────── */

interface FormScreenProps {
  title: string;
  subtitle?: string;
  onBack: () => void;
  children: ReactNode;
  /** Footer sticky (CTA) */
  footer?: ReactNode;
  /** Barre de progression multi-étapes 0–1 */
  progress?: number;
  /** Action droite header (ex. Publier) */
  headerRight?: ReactNode;
  loading?: boolean;
}

export function FormScreen({
  title,
  subtitle,
  onBack,
  children,
  footer,
  progress,
  headerRight,
  loading,
}: FormScreenProps) {
  const { colors } = useThemeFlavor();
  const insets = useSafeAreaInsets();

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color={colors.turmeric} />
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: colors.bg, paddingTop: insets.top }}>
      <View
        style={{
          backgroundColor: colors.nav,
          borderBottomColor: colors.border,
          borderBottomWidth: 1,
        }}
        className="px-4 pb-3 pt-2"
      >
        <View className="flex-row items-center justify-between">
          <Pressable
            onPress={onBack}
            hitSlop={10}
            style={{ backgroundColor: colors.card, borderColor: colors.border }}
            className="w-10 h-10 rounded-full border items-center justify-center active:opacity-80"
          >
            <ArrowLeft size={18} color={colors.text} strokeWidth={2.2} />
          </Pressable>
          <View className="flex-1 px-3 items-center">
            <Text
              style={{ color: colors.text }}
              className="font-space text-[16px] font-bold"
              numberOfLines={1}
            >
              {title}
            </Text>
            {subtitle ? (
              <Text
                style={{ color: colors.textSecondary }}
                className="font-inter text-[11px] mt-0.5"
                numberOfLines={1}
              >
                {subtitle}
              </Text>
            ) : null}
          </View>
          <View className="min-w-[40px] items-end">{headerRight ?? <View className="w-10" />}</View>
        </View>

        {typeof progress === 'number' ? (
          <View
            style={{ backgroundColor: colors.border }}
            className="h-1 rounded-full mt-3 overflow-hidden"
          >
            <View
              style={{
                backgroundColor: colors.turmeric,
                width: `${Math.round(Math.min(1, Math.max(0, progress)) * 100)}%`,
              }}
              className="h-full rounded-full"
            />
          </View>
        ) : null}
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            padding: 16,
            paddingBottom: footer ? 24 : 40 + insets.bottom,
            gap: 16,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>

        {footer ? (
          <View
            style={{
              backgroundColor: colors.nav,
              borderTopColor: colors.border,
              borderTopWidth: 1,
              paddingBottom: Math.max(insets.bottom, 12),
            }}
            className="px-4 pt-3"
          >
            {footer}
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </View>
  );
}

/* ─── Section card ──────────────────────────────────────── */

export function FormSection({
  title,
  subtitle,
  icon: Icon,
  children,
  stepLabel,
}: {
  title?: string;
  subtitle?: string;
  icon?: LucideIcon;
  children: ReactNode;
  stepLabel?: string;
}) {
  const { colors } = useThemeFlavor();
  return (
    <View
      style={{ backgroundColor: colors.card, borderColor: colors.border }}
      className="border rounded-3xl p-4 gap-4"
    >
      {(title || stepLabel) && (
        <View className="flex-row items-start gap-3">
          {Icon ? (
            <View
              style={{ backgroundColor: colors.turmeric + '18' }}
              className="w-10 h-10 rounded-2xl items-center justify-center"
            >
              <Icon size={18} color={colors.turmeric} strokeWidth={2.2} />
            </View>
          ) : null}
          <View className="flex-1">
            {stepLabel ? (
              <Text
                style={{ color: colors.turmeric }}
                className="font-inter text-[10px] font-bold uppercase tracking-widest mb-0.5"
              >
                {stepLabel}
              </Text>
            ) : null}
            {title ? (
              <Text style={{ color: colors.text }} className="font-space text-[15px] font-bold">
                {title}
              </Text>
            ) : null}
            {subtitle ? (
              <Text
                style={{ color: colors.textSecondary }}
                className="font-inter text-[12px] leading-5 mt-0.5"
              >
                {subtitle}
              </Text>
            ) : null}
          </View>
        </View>
      )}
      {children}
    </View>
  );
}

/* ─── Text field ────────────────────────────────────────── */

interface FormFieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  counter?: { current: number; max: number };
  leftIcon?: LucideIcon;
  containerStyle?: ViewStyle;
}

export function FormField({
  label,
  hint,
  error,
  required,
  counter,
  leftIcon: LeftIcon,
  containerStyle,
  ...inputProps
}: FormFieldProps) {
  const { colors } = useThemeFlavor();
  const [focused, setFocused] = useState(false);
  const borderColor = error
    ? colors.corail
    : focused
      ? colors.turmeric
      : colors.border;

  return (
    <View className="gap-1.5" style={containerStyle}>
      <View className="flex-row items-center justify-between">
        <Text
          style={{ color: focused ? colors.turmeric : colors.textSecondary }}
          className="font-inter text-[11px] font-semibold tracking-wide"
        >
          {label}
          {required ? ' *' : ''}
        </Text>
        {counter ? (
          <Text
            style={{
              color:
                counter.current > counter.max * 0.9
                  ? colors.corail
                  : colors.textSecondary,
            }}
            className="font-inter text-[10px]"
          >
            {counter.current}/{counter.max}
          </Text>
        ) : null}
      </View>
      <View
        style={{
          backgroundColor: colors.deep,
          borderColor,
          borderWidth: focused || error ? 1.5 : 1,
        }}
        className="rounded-2xl flex-row items-center px-3.5 min-h-[52px]"
      >
        {LeftIcon ? (
          <LeftIcon
            size={16}
            color={focused ? colors.turmeric : colors.textSecondary}
            style={{ marginRight: 10 }}
          />
        ) : null}
        <TextInput
          {...inputProps}
          placeholderTextColor={colors.textSecondary + '99'}
          onFocus={(e) => {
            setFocused(true);
            inputProps.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            inputProps.onBlur?.(e);
          }}
          style={{
            flex: 1,
            color: colors.text,
            fontSize: 15,
            paddingVertical: Platform.OS === 'ios' ? 14 : 12,
            fontFamily: 'Inter400',
          }}
        />
      </View>
      {error ? (
        <Text style={{ color: colors.corail }} className="font-inter text-[11px] leading-4">
          {error}
        </Text>
      ) : hint ? (
        <Text style={{ color: colors.textSecondary }} className="font-inter text-[11px] leading-4">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

/** Textarea avec minHeight dédié (FormField base est single-line) */
export function FormMultiline({
  label,
  hint,
  error,
  required,
  counter,
  minHeight = 128,
  ...inputProps
}: FormFieldProps & { minHeight?: number }) {
  const { colors } = useThemeFlavor();
  const [focused, setFocused] = useState(false);
  const borderColor = error
    ? colors.corail
    : focused
      ? colors.turmeric
      : colors.border;

  return (
    <View className="gap-1.5">
      <View className="flex-row items-center justify-between">
        <Text
          style={{ color: focused ? colors.turmeric : colors.textSecondary }}
          className="font-inter text-[11px] font-semibold tracking-wide"
        >
          {label}
          {required ? ' *' : ''}
        </Text>
        {counter ? (
          <Text
            style={{
              color:
                counter.current > counter.max * 0.9
                  ? colors.corail
                  : colors.textSecondary,
            }}
            className="font-inter text-[10px]"
          >
            {counter.current}/{counter.max}
          </Text>
        ) : null}
      </View>
      <View
        style={{
          backgroundColor: colors.deep,
          borderColor,
          borderWidth: focused || error ? 1.5 : 1,
          minHeight,
        }}
        className="rounded-2xl px-3.5 py-3"
      >
        <TextInput
          {...inputProps}
          multiline
          textAlignVertical="top"
          placeholderTextColor={colors.textSecondary + '99'}
          onFocus={(e) => {
            setFocused(true);
            inputProps.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            inputProps.onBlur?.(e);
          }}
          style={{
            color: colors.text,
            fontSize: 15,
            minHeight: minHeight - 24,
            fontFamily: 'Inter400',
            lineHeight: 22,
          }}
        />
      </View>
      {error ? (
        <Text style={{ color: colors.corail }} className="font-inter text-[11px]">
          {error}
        </Text>
      ) : hint ? (
        <Text style={{ color: colors.textSecondary }} className="font-inter text-[11px]">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

/* ─── Choice cards / chips ──────────────────────────────── */

export interface ChoiceOption {
  id: string;
  label: string;
  description?: string;
  color?: string;
}

export function ChoiceGrid({
  options,
  value,
  onChange,
  columns = 3,
}: {
  options: ChoiceOption[];
  value: string;
  onChange: (id: string) => void;
  columns?: 2 | 3;
}) {
  const { colors } = useThemeFlavor();
  return (
    <View className="flex-row flex-wrap" style={{ gap: 8 }}>
      {options.map((opt) => {
        const active = value === opt.id;
        const accent = opt.color || colors.turmeric;
        const basis = columns === 3 ? '31%' : '47%';
        return (
          <Pressable
            key={opt.id}
            onPress={() => onChange(opt.id)}
            style={{
              flexBasis: basis,
              flexGrow: 1,
              backgroundColor: active ? accent + '14' : colors.deep,
              borderColor: active ? accent : colors.border,
              borderWidth: active ? 1.5 : 1,
            }}
            className="rounded-2xl p-3 min-h-[72px] justify-center active:opacity-90"
          >
            <Text
              style={{ color: active ? accent : colors.text }}
              className="font-space text-[12px] font-bold"
            >
              {opt.label}
            </Text>
            {opt.description ? (
              <Text
                style={{ color: colors.textSecondary }}
                className="font-inter text-[10px] mt-1 leading-4"
                numberOfLines={2}
              >
                {opt.description}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

export function ChipSelect({
  options,
  values,
  onChange,
  multi = true,
}: {
  options: { id: string; label: string }[];
  values: string[];
  onChange: (next: string[]) => void;
  multi?: boolean;
}) {
  const { colors } = useThemeFlavor();

  const toggle = (id: string) => {
    if (multi) {
      onChange(values.includes(id) ? values.filter((v) => v !== id) : [...values, id]);
    } else {
      onChange(values[0] === id ? [] : [id]);
    }
  };

  return (
    <View className="flex-row flex-wrap gap-2">
      {options.map((opt) => {
        const active = values.includes(opt.id);
        return (
          <Pressable
            key={opt.id}
            onPress={() => toggle(opt.id)}
            style={{
              backgroundColor: active ? colors.turmeric : colors.deep,
              borderColor: active ? colors.turmeric : colors.border,
            }}
            className="px-3.5 py-2.5 rounded-full border flex-row items-center gap-1.5 active:opacity-90"
          >
            <Text
              style={{ color: active ? colors.onTurmeric : colors.textSecondary }}
              className="font-inter text-[12px] font-semibold"
            >
              {opt.label}
            </Text>
            {active ? <Check size={12} color={colors.onTurmeric} strokeWidth={2.8} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

/* ─── Banners & alerts ──────────────────────────────────── */

export function ImpactBanner({
  points,
  label,
}: {
  points: number;
  label?: string;
}) {
  const { colors } = useThemeFlavor();
  return (
    <View
      style={{
        backgroundColor: colors.turmeric + '14',
        borderColor: colors.turmeric + '44',
      }}
      className="border rounded-2xl px-4 py-3 flex-row items-center gap-3"
    >
      <View
        className="px-2.5 py-1 rounded-full"
        style={{ backgroundColor: colors.turmeric }}
      >
        <Text style={{ color: colors.onTurmeric }} className="font-space text-[12px] font-bold">
          +{points}
        </Text>
      </View>
      <Text style={{ color: colors.text }} className="font-inter text-[12px] flex-1 leading-5">
        {label || 'Impact crédité à la publication'}
      </Text>
    </View>
  );
}

export function FormAlert({
  message,
  tone = 'error',
}: {
  message: string;
  tone?: 'error' | 'success' | 'info';
}) {
  const { colors } = useThemeFlavor();
  const bg =
    tone === 'error'
      ? colors.corail + '18'
      : tone === 'success'
        ? colors.kaki + '18'
        : colors.turmeric + '14';
  const border =
    tone === 'error'
      ? colors.corail + '40'
      : tone === 'success'
        ? colors.kaki + '40'
        : colors.turmeric + '40';
  const fg =
    tone === 'error' ? colors.corail : tone === 'success' ? colors.kaki : colors.turmeric;

  return (
    <View
      style={{ backgroundColor: bg, borderColor: border }}
      className="border rounded-2xl px-4 py-3"
    >
      <Text style={{ color: fg }} className="font-inter text-[12px] font-semibold leading-5">
        {message}
      </Text>
    </View>
  );
}

/* ─── CTA buttons ───────────────────────────────────────── */

export function PrimaryButton({
  label,
  onPress,
  loading,
  disabled,
  icon: Icon,
  secondary,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  icon?: LucideIcon;
  secondary?: boolean;
}) {
  const { colors } = useThemeFlavor();
  const isDisabled = disabled || loading;

  if (secondary) {
    return (
      <Pressable
        onPress={onPress}
        disabled={isDisabled}
        style={{
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: isDisabled ? 0.5 : 1,
        }}
        className="min-h-[52px] rounded-2xl border flex-row items-center justify-center gap-2 active:opacity-85"
      >
        {loading ? (
          <ActivityIndicator color={colors.text} />
        ) : (
          <>
            {Icon ? <Icon size={18} color={colors.text} strokeWidth={2.2} /> : null}
            <Text style={{ color: colors.text }} className="font-inter text-[15px] font-bold">
              {label}
            </Text>
          </>
        )}
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      className="min-h-[52px] rounded-2xl flex-row items-center justify-center gap-2 active:opacity-90 bg-turmeric"
      style={{ opacity: isDisabled ? 0.45 : 1 }}
    >
      {loading ? (
        <ActivityIndicator color="#0D0B05" />
      ) : (
        <>
          {Icon ? <Icon size={18} color="#0D0B05" strokeWidth={2.4} /> : null}
          <Text className="font-inter text-[15px] font-bold" style={{ color: '#0D0B05' }}>
            {label}
          </Text>
          {!Icon ? <ChevronRight size={18} color="#0D0B05" strokeWidth={2.4} /> : null}
        </>
      )}
    </Pressable>
  );
}

export function StepFooter({
  onBack,
  onNext,
  nextLabel = 'Continuer',
  backLabel = 'Retour',
  showBack,
  loading,
  nextDisabled,
  nextIcon,
}: {
  onBack?: () => void;
  onNext: () => void;
  nextLabel?: string;
  backLabel?: string;
  showBack?: boolean;
  loading?: boolean;
  nextDisabled?: boolean;
  nextIcon?: LucideIcon;
}) {
  return (
    <View className="flex-row gap-2">
      {showBack && onBack ? (
        <View className="flex-1">
          <PrimaryButton label={backLabel} onPress={onBack} secondary />
        </View>
      ) : null}
      <View className={showBack ? 'flex-[1.4]' : 'flex-1'}>
        <PrimaryButton
          label={nextLabel}
          onPress={onNext}
          loading={loading}
          disabled={nextDisabled}
          icon={nextIcon}
        />
      </View>
    </View>
  );
}
