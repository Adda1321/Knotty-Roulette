import React from 'react';
import {
    Modal,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { COLORS, FONTS, SIZES } from '../../constants/theme';
import Button from './Button';
import SparkleEffect from './SparkleEffect';

interface CustomModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  children?: React.ReactNode;
  showCloseButton?: boolean;
  closeButtonText?: string;
  onConfirm?: () => void;
  confirmButtonText?: string;
  showConfirmButton?: boolean;
  destructive?: boolean;
  showSparkles?: boolean;
}

export default function CustomModal({
  visible,
  onClose,
  title,
  message,
  children,
  showCloseButton = true,
  closeButtonText = "Cancel",
  onConfirm,
  confirmButtonText = "Confirm",
  showConfirmButton = false,
  destructive = false,
  showSparkles = false,
}: CustomModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          {title && (
            <View style={styles.header}>
              <Text style={styles.title}>{title}</Text>
            </View>
          )}

          {/* Content */}
          <View style={styles.content}>
            {showSparkles && (
              <View style={styles.sparkleContainer}>
                <SparkleEffect
                  visible={true}
                  duration={3000}
                  sparkleCount={8}
                  symbols={["✨", "🌟", "💫", "⭐", "🎉"]}
                  onAnimationComplete={() => {}}
                />
              </View>
            )}
            {message && (
              <Text style={styles.message}>{message}</Text>
            )}
            {children}
          </View>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            {showCloseButton && (
              <Button
                text={closeButtonText}
                onPress={onClose}
                backgroundColor={COLORS.YELLOW}
                textColor={COLORS.TEXT_DARK}
                fontSize={SIZES.BODY}
                fontWeight="600"
                fontFamily={FONTS.DOSIS_BOLD}
                paddingHorizontal={SIZES.PADDING_MEDIUM}
                paddingVertical={SIZES.PADDING_MEDIUM}
                showGlare={true}
                glareColor="rgba(255, 255, 255, 0.6)"
                glareDuration={2000}
                glareDelay={50}
                shadowIntensity={5}
                shadowRadius={8}
                style={styles.button}
              />
            )}
            
            {showConfirmButton && onConfirm && (
              <Button
                text={confirmButtonText}
                onPress={onConfirm}
                backgroundColor={destructive ? COLORS.OFFLINE : COLORS.DARK_GREEN}
                textColor={COLORS.TEXT_PRIMARY}
                fontSize={SIZES.BODY}
                fontWeight="600"
                fontFamily={FONTS.PRIMARY}
                paddingHorizontal={SIZES.PADDING_MEDIUM}
                paddingVertical={SIZES.PADDING_MEDIUM}
                shadowIntensity={3}
                shadowRadius={6}
                style={styles.button}
              />
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SIZES.PADDING_LARGE,
  },
  container: {
    backgroundColor: COLORS.CARD_BACKGROUND,
    borderRadius: SIZES.BORDER_RADIUS_LARGE,
    width: '100%',
    maxWidth: 400,
    ...SIZES.SHADOW_LARGE,
  },
  header: {
    backgroundColor: COLORS.DARK_GREEN,
    borderTopLeftRadius: SIZES.BORDER_RADIUS_LARGE,
    borderTopRightRadius: SIZES.BORDER_RADIUS_LARGE,
    padding: SIZES.PADDING_LARGE,
    alignItems: 'center',
  },
  title: {
    fontSize: SIZES.TITLE,
    color: COLORS.YELLOW,
    fontFamily: FONTS.DOSIS_BOLD,
    textAlign: 'center',
  },
  content: {
    padding: SIZES.PADDING_LARGE,
    minHeight: 80,
    justifyContent: 'center',
  },
  message: {
    fontSize: SIZES.BODY,
    color: COLORS.TEXT_DARK,
    fontFamily: FONTS.PRIMARY,
    textAlign: 'center',
    lineHeight: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    padding: SIZES.PADDING_LARGE,
    gap: SIZES.PADDING_MEDIUM,
  },
  button: {
    flex: 1,
    borderRadius: SIZES.BORDER_RADIUS_MEDIUM,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sparkleContainer: {
    position: 'absolute',
    top: -20,
    left: -20,
    right: -20,
    bottom: -20,
    zIndex: 1,
    pointerEvents: 'none',
  },
}); 