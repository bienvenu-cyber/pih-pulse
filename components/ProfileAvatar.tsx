import { Image } from 'expo-image';
import { Text, View } from 'react-native';
import { getInitials } from '../lib/formatTime';

type Props = {
  uri?: string | null;
  name?: string | null;
  size?: number;
  /** Initiales de secours (si name absent) */
  initials?: string | null;
  bg?: string;
  borderColor?: string;
  textColor?: string;
  className?: string;
};

/**
 * Avatar profil : photo si `uri`, sinon initiales.
 */
export function ProfileAvatar({
  uri,
  name,
  size = 40,
  initials,
  bg = '#18140B',
  borderColor = '#261F12',
  textColor = '#F5EDD6',
}: Props) {
  const label = (initials || getInitials(name)).slice(0, 2);
  const radius = size / 2;
  const fontSize = size >= 48 ? 16 : size >= 40 ? 12 : 10;

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        backgroundColor: bg,
        borderColor,
        borderWidth: 1,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {uri ? (
        <Image
          source={{ uri }}
          style={{ width: size, height: size }}
          contentFit="cover"
          transition={120}
        />
      ) : (
        <Text
          style={{
            color: textColor,
            fontSize,
            fontWeight: '700',
            fontFamily: 'SpaceGrotesk700',
          }}
        >
          {label}
        </Text>
      )}
    </View>
  );
}
