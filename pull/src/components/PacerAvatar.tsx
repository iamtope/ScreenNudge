import React, { type ComponentProps } from 'react';
import { View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { PACER_COLOR } from '@/src/domain/pacer';

type Glyph = ComponentProps<typeof MaterialCommunityIcons>['name'];

/**
 * A bot's avatar: a robot glyph in a tinted badge coloured per bot. Deliberately
 * not a human-style initial/photo — it reads at a glance as "a program, not a
 * person", which is the whole point of a disclosed bot.
 */
export function PacerAvatar({
  size = 34,
  color = PACER_COLOR,
  glyph = 'robot',
}: {
  size?: number;
  color?: string;
  glyph?: Glyph;
}) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: `${color}1f`, // ~12% opacity tint
        borderWidth: 1,
        borderColor: `${color}66`, // ~40% opacity border
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <MaterialCommunityIcons name={glyph} size={size * 0.58} color={color} />
    </View>
  );
}
