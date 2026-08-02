import DeviceActivity
import ExtensionKit
import FamilyControls
import ManagedSettings
import SwiftUI

extension DeviceActivityReport.Context {
  /// Must match the context string the app passes to DeviceActivityReport.
  static let screenNudge = Self("ScreenNudge Report")
}

struct AppUsageRow: Identifiable {
  let token: ApplicationToken
  let duration: TimeInterval
  let pickups: Int
  let notifications: Int

  var id: ApplicationToken { token }
}

struct ScreenTimeReportData {
  var totalDuration: TimeInterval = 0
  var totalPickups: Int = 0
  var totalNotifications: Int = 0
  /// Pickups keyed by hour of day (0–23). Only populated when the app requests an
  /// hourly segment interval; daily/weekly filters collapse into a single bucket.
  var pickupsByHour: [Int: Int] = [:]
  var apps: [AppUsageRow] = []

  var topByDuration: [AppUsageRow] { apps.sorted { $0.duration > $1.duration } }
  var topByPickups: [AppUsageRow] { apps.sorted { $0.pickups > $1.pickups } }
  var topByNotifications: [AppUsageRow] { apps.sorted { $0.notifications > $1.notifications } }

  var isEmpty: Bool { totalDuration == 0 && totalPickups == 0 && totalNotifications == 0 }
}

struct ScreenNudgeReport: DeviceActivityReportScene {
  let context: DeviceActivityReport.Context = .screenNudge
  let content: (ScreenTimeReportData) -> ScreenNudgeReportView

  func makeConfiguration(
    representing data: DeviceActivityResults<DeviceActivityData>
  ) async -> ScreenTimeReportData {
    var report = ScreenTimeReportData()
    // Apps are aggregated by token, not bundle identifier: outside a privileged
    // context `bundleIdentifier` and `localizedDisplayName` are usually nil, and the
    // token is the only thing that both identifies an app and can be rendered.
    var totals: [ApplicationToken: AppUsageRow] = [:]
    let calendar = Calendar.current

    for await result in data {
      for await segment in result.activitySegments {
        report.totalDuration += segment.totalActivityDuration

        let hour = calendar.component(.hour, from: segment.dateInterval.start)
        // Pickups that never opened an app still count as reaching for the phone.
        var segmentPickups = segment.totalPickupsWithoutApplicationActivity

        // `applications` hangs off CategoryActivity, not off the segment, so both
        // levels have to be walked to see every app.
        for await category in segment.categories {
          for await app in category.applications {
            segmentPickups += app.numberOfPickups
            report.totalNotifications += app.numberOfNotifications

            guard let token = app.application.token else { continue }
            let existing = totals[token]
            totals[token] = AppUsageRow(
              token: token,
              duration: (existing?.duration ?? 0) + app.totalActivityDuration,
              pickups: (existing?.pickups ?? 0) + app.numberOfPickups,
              notifications: (existing?.notifications ?? 0) + app.numberOfNotifications
            )
          }
        }

        report.totalPickups += segmentPickups
        report.pickupsByHour[hour, default: 0] += segmentPickups
      }
    }

    report.apps = Array(totals.values)
    return report
  }
}
