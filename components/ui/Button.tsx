import React from 'react';
import { StyleSheet, Text, TouchableOpacity, TouchableOpacityProps } from 'react-native';
import { COLORS, FONTS, SIZES } from '../../constants/theme';

interface ButtonProps extends TouchableOpacityProps {
  backgroundColor?: string;
  text: string;
  paddingHorizontal?: number;
  paddingVertical?: number;
  textColor?: string;
  fontSize?: number;
  fontWeight?: 'normal' | 'bold' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900';
}

export default function Button({
  backgroundColor = COLORS.YELLOW,
  text,
  paddingHorizontal = SIZES.PADDING_MEDIUM,
  paddingVertical = SIZES.PADDING_SMALL,
  textColor = COLORS.TEXT_PRIMARY,
  fontSize = SIZES.CAPTION,
  fontWeight = '600',
  style,
  ...props
}: ButtonProps) {
  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor,
          paddingHorizontal,
          paddingVertical,
        },
        style,
      ]}
      {...props}
    >
      <Text
        style={[
          styles.buttonText,
          {
            color: textColor,
            fontSize,
            fontWeight,
          },
        ]}
      >
        {text}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: SIZES.BORDER_RADIUS_SMALL,
    alignItems: 'center',
    justifyContent: 'center',
    ...SIZES.SHADOW_SMALL,
  },
  buttonText: {
    fontFamily: FONTS.PRIMARY,
    textAlign: 'center',
  },
}); 