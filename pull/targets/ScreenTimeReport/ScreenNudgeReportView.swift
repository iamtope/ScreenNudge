import FamilyControls
import ManagedSettings
import SwiftUI

private let topAppLimit = 5

/// How long an empty report is treated as "still arriving" before we conclude there
/// is genuinely nothing to show. The scene can render before Screen Time has finished
/// streaming, so an immediate empty state reads as a bug when it is really just early.
private let settleDelay: UInt64 = 2_500_000_000

struct ScreenNudgeReportView: View {
  let data: ScreenTimeReportData
  @State private var settled = false

  var body: some View {
    if data.isEmpty && !settled {
      loadingState
        .task {
          try? await Task.sleep(nanoseconds: settleDelay)
          settled = true
        }
    } else if data.isEmpty {
      emptyState
    } else {
      // The report scrolls itself. Embedding it in a React Native ScrollView instead
      // meant a tall out-of-process view being composited inside a moving container,
      // which made scrolling fight back — so the extension owns the scrolling and the
      // app gives it a whole screen.
      ScrollView {
        VStack(alignment: .leading, spacing: 22) {
          summary
          pickupsPerHour
          appList("Most screen time", rows: data.topByDuration) { formatDuration($0.duration) }
          appList("Most pickups", rows: data.topByPickups) { "\($0.pickups)" }
          appList("Most notifications", rows: data.topByNotifications) { "\($0.notifications)" }
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 16)
      }
    }
  }

  private var loadingState: some View {
    VStack(spacing: 12) {
      ProgressView()
        .tint(ScreenNudgePalette.brass)
      Text("Reading Screen Time…")
        .font(.system(size: 14))
        .foregroundColor(ScreenNudgePalette.textMute)
    }
    .frame(maxWidth: .infinity)
    .padding(.vertical, 40)
  }

  private var emptyState: some View {
    VStack(spacing: 8) {
      Text("No Screen Time yet")
        .font(.system(size: 17, weight: .semibold))
        .foregroundColor(ScreenNudgePalette.text)
      Text("Apple needs a little usage before it can report on your day.")
        .font(.system(size: 14))
        .foregroundColor(ScreenNudgePalette.textMute)
        .multilineTextAlignment(.center)
    }
    .frame(maxWidth: .infinity)
    .padding(.vertical, 40)
  }

  // MARK: - Summary

  private var summary: some View {
    HStack(spacing: 0) {
      summaryTile(formatDuration(data.totalDuration), "SCREEN TIME")
      divider
      summaryTile("\(data.totalPickups)", "PICKUPS")
      divider
      summaryTile("\(data.totalNotifications)", "NOTIFICATIONS")
    }
    .padding(.vertical, 16)
    .background(ScreenNudgePalette.surface)
    .overlay(RoundedRectangle(cornerRadius: 16).stroke(ScreenNudgePalette.line, lineWidth: 1))
    .clipShape(RoundedRectangle(cornerRadius: 16))
  }

  private func summaryTile(_ value: String, _ label: String) -> some View {
    VStack(spacing: 4) {
      Text(value)
        .font(.system(size: 22, weight: .bold))
        .foregroundColor(ScreenNudgePalette.text)
        .minimumScaleFactor(0.6)
        .lineLimit(1)
      Text(label)
        .font(.system(size: 10, weight: .medium))
        .tracking(1.1)
        .foregroundColor(ScreenNudgePalette.textMute)
    }
    .frame(maxWidth: .infinity)
  }

  private var divider: some View {
    Rectangle().fill(ScreenNudgePalette.line).frame(width: 1, height: 34)
  }

  // MARK: - Pickups per hour

  private var pickupsPerHour: some View {
    let counts = (0..<24).map { data.pickupsByHour[$0] ?? 0 }
    let peak = max(counts.max() ?? 0, 1)

    return VStack(alignment: .leading, spacing: 10) {
      sectionTitle("Pickups per hour")

      HStack(alignment: .bottom, spacing: 3) {
        ForEach(Array(counts.enumerated()), id: \.offset) { _, count in
          RoundedRectangle(cornerRadius: 2)
            .fill(count == 0 ? ScreenNudgePalette.line : ScreenNudgePalette.brass)
            // Zero hours keep a hairline so the axis still reads as 24 slots.
            .frame(height: count == 0 ? 2 : max(3, 120 * CGFloat(count) / CGFloat(peak)))
            .frame(maxWidth: .infinity)
        }
      }
      .frame(height: 120, alignment: .bottom)

      HStack {
        hourLabel("12 AM")
        Spacer()
        hourLabel("6 AM")
        Spacer()
        hourLabel("12 PM")
        Spacer()
        hourLabel("6 PM")
      }
    }
    .padding(14)
    .background(ScreenNudgePalette.surface)
    .overlay(RoundedRectangle(cornerRadius: 16).stroke(ScreenNudgePalette.line, lineWidth: 1))
    .clipShape(RoundedRectangle(cornerRadius: 16))
  }

  private func hourLabel(_ text: String) -> some View {
    Text(text)
      .font(.system(size: 11))
      .foregroundColor(ScreenNudgePalette.textMute)
  }

  // MARK: - App lists

  private func appList(
    _ title: String,
    rows: [AppUsageRow],
    value: @escaping (AppUsageRow) -> String
  ) -> some View {
    let visible = Array(rows.prefix(topAppLimit))

    return VStack(alignment: .leading, spacing: 10) {
      sectionTitle(title)

      if visible.isEmpty {
        Text("Nothing recorded")
          .font(.system(size: 14))
          .foregroundColor(ScreenNudgePalette.textMute)
      } else {
        VStack(spacing: 12) {
          ForEach(visible) { row in
            HStack(spacing: 12) {
              // Label(ApplicationToken) is the only way to show the real icon and
              // name — the token is opaque and cannot be resolved to either itself.
              Label(row.token)
                .labelStyle(AppRowLabelStyle())
              Spacer(minLength: 8)
              Text(value(row))
                .font(.system(size: 15, weight: .semibold))
                .foregroundColor(ScreenNudgePalette.brass)
            }
          }
        }
      }
    }
    .padding(14)
    .background(ScreenNudgePalette.surface)
    .overlay(RoundedRectangle(cornerRadius: 16).stroke(ScreenNudgePalette.line, lineWidth: 1))
    .clipShape(RoundedRectangle(cornerRadius: 16))
  }

  private func sectionTitle(_ text: String) -> some View {
    Text(text)
      .font(.system(size: 13, weight: .semibold))
      .tracking(1.2)
      .textCase(.uppercase)
      .foregroundColor(ScreenNudgePalette.textMute)
  }
}

/// Keeps Apple's app icon at a fixed size and applies our type styling to the name.
private struct AppRowLabelStyle: LabelStyle {
  func makeBody(configuration: Configuration) -> some View {
    HStack(spacing: 12) {
      configuration.icon
        .frame(width: 30, height: 30)
        .clipShape(RoundedRectangle(cornerRadius: 7))
      configuration.title
        .font(.system(size: 16))
        .foregroundColor(ScreenNudgePalette.text)
        .lineLimit(1)
    }
  }
}
