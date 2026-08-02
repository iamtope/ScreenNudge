import SwiftUI
import UIKit

/// Mirrors src/theme/palette.ts. The report renders out-of-process so it cannot read
/// the JS palette — these values must be kept in step with it by hand.
enum ScreenNudgePalette {
  static let surface = dynamic(light: 0xFFFFFF, dark: 0x16161F)
  static let surface2 = dynamic(light: 0xECE4D4, dark: 0x20202C)
  static let line = dynamic(light: 0xD6CBB4, dark: 0x2C2C3D)
  static let text = dynamic(light: 0x1A1712, dark: 0xF5F5FF)
  static let textMute = dynamic(light: 0x6E6757, dark: 0x8B8B95)
  static let textSoft = dynamic(light: 0x544F45, dark: 0xB1B1BC)
  static let brass = dynamic(light: 0x8A6A28, dark: 0xD7C18E)

  private static func dynamic(light: Int, dark: Int) -> Color {
    Color(UIColor { traits in
      UIColor(rgb: traits.userInterfaceStyle == .dark ? dark : light)
    })
  }
}

private extension UIColor {
  convenience init(rgb: Int) {
    self.init(
      red: CGFloat((rgb >> 16) & 0xFF) / 255,
      green: CGFloat((rgb >> 8) & 0xFF) / 255,
      blue: CGFloat(rgb & 0xFF) / 255,
      alpha: 1
    )
  }
}

func formatDuration(_ seconds: TimeInterval) -> String {
  let total = Int(seconds.rounded())
  let hours = total / 3600
  let minutes = (total % 3600) / 60
  if hours == 0 {
    return "\(minutes)m"
  }
  return minutes == 0 ? "\(hours)h" : "\(hours)h \(minutes)m"
}
