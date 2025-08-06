import React from "react";
import {
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Surface } from "react-native-paper";
import { COLORS, FONTS, SIZES } from "../../constants/theme";
import ModalSparkles from "./ModalSparkles";

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
  sparkleStaggerDelay?: number;
  sparkleFadeDelay?: number;
  sparkleFadeDuration?: number;
  sparkleAppearDuration?: number;
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
  sparkleStaggerDelay = 100,
  sparkleFadeDelay = 200,
  sparkleFadeDuration = 300,
  sparkleAppearDuration = 300,
}: CustomModalProps) {
  // Don't render anything if modal is not visible
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* ModalSparkles wraps the entire modal */}
          <ModalSparkles
            visible={showSparkles}
            onComplete={() => console.log("Modal sparkles completed")}
            staggerDelay={sparkleStaggerDelay}
            fadeDelay={sparkleFadeDelay}
            fadeDuration={sparkleFadeDuration}
            appearDuration={sparkleAppearDuration}
          />

          {/* Header */}
          {title && (
            <View style={styles.header}>
              <Text style={styles.title}>{title}</Text>
            </View>
          )}

          {/* Content */}
          <View style={styles.content}>
            {message && <Text style={styles.message}>{message}</Text>}
            {children}
          </View>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            {showCloseButton &&
              (Platform.OS === "ios" ? (
                <View style={styles.buttonContainerIOS}>
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={onClose}
                  >
                    <Text style={styles.closeButtonText}>
                      {closeButtonText}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <Surface elevation={3} style={styles.buttonSurface}>
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={onClose}
                  >
                    <Text style={styles.closeButtonText}>
                      {closeButtonText}
                    </Text>
                  </TouchableOpacity>
                </Surface>
              ))}

            {showConfirmButton &&
              onConfirm &&
              (Platform.OS === "ios" ? (
                <View style={styles.buttonContainerIOS}>
                  <TouchableOpacity
                    style={[
                      styles.confirmButton,
                      destructive && styles.destructiveButton,
                    ]}
                    onPress={onConfirm}
                  >
                    <Text style={styles.confirmButtonText}>
                      {confirmButtonText}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <Surface elevation={3} style={styles.buttonSurface}>
                  <TouchableOpacity
                    style={[
                      styles.confirmButton,
                      destructive && styles.destructiveButton,
                    ]}
                    onPress={onConfirm}
                  >
                    <Text style={styles.confirmButtonText}>
                      {confirmButtonText}
                    </Text>
                  </TouchableOpacity>
                </Surface>
              ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: SIZES.PADDING_LARGE,
  },
  container: {
    backgroundColor: COLORS.CARD_BACKGROUND,
    borderRadius: SIZES.BORDER_RADIUS_LARGE,
    width: "100%",
    maxWidth: 400,
    ...SIZES.SHADOW_LARGE,
    position: "relative", // Important for sparkle positioning
  },
  header: {
    backgroundColor: COLORS.DARK_GREEN,
    borderTopLeftRadius: SIZES.BORDER_RADIUS_LARGE,
    borderTopRightRadius: SIZES.BORDER_RADIUS_LARGE,
    padding: SIZES.PADDING_LARGE,
    alignItems: "center",
  },
  title: {
    fontSize: SIZES.TITLE,
    color: COLORS.YELLOW,
    fontFamily: FONTS.DOSIS_BOLD,
    textAlign: "center",
  },
  content: {
    padding: SIZES.PADDING_LARGE,
    minHeight: 80,
    justifyContent: "center",
  },
  message: {
    fontSize: SIZES.BODY,
    color: COLORS.TEXT_DARK,
    fontFamily: FONTS.PRIMARY,
    textAlign: "center",
    lineHeight: 24,
  },
  buttonContainer: {
    flexDirection: "row",
    padding: SIZES.PADDING_LARGE,
    gap: SIZES.PADDING_MEDIUM,
  },
  buttonContainerIOS: {
    flex: 1,
    borderRadius: SIZES.BORDER_RADIUS_SMALL,
    // iOS shadow properties
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  buttonSurface: {
    flex: 1,
    borderRadius: SIZES.BORDER_RADIUS_SMALL,
    overflow: "hidden",
  },
  closeButton: {
    backgroundColor: COLORS.YELLOW,
    paddingHorizontal: SIZES.PADDING_MEDIUM,
    paddingVertical: SIZES.PADDING_MEDIUM,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: SIZES.BORDER_RADIUS_SMALL,
  },
  closeButtonText: {
    fontSize: SIZES.BODY,
    color: COLORS.TEXT_DARK,
    fontFamily: FONTS.DOSIS_BOLD,
    fontWeight: "600",
  },
  confirmButton: {
    backgroundColor: COLORS.DARK_GREEN,
    paddingHorizontal: SIZES.PADDING_MEDIUM,
    paddingVertical: SIZES.PADDING_MEDIUM,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: SIZES.BORDER_RADIUS_SMALL,
  },
  destructiveButton: {
    backgroundColor: COLORS.OFFLINE,
  },
  confirmButtonText: {
    fontSize: SIZES.BODY,
    color: COLORS.TEXT_PRIMARY,
    fontFamily: FONTS.PRIMARY,
    fontWeight: "600",
  },
});
