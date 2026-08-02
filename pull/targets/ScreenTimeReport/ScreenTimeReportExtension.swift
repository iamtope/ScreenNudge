import DeviceActivity
import ExtensionKit
import SwiftUI

// Screen Time data can only be read inside this extension — the sandbox blocks it
// from reaching the app, shared storage or the network. Everything shown here is
// therefore computed and rendered in-process; nothing is handed back to JS.
@main
struct ScreenTimeReportExtension: DeviceActivityReportExtension {
  var body: some DeviceActivityReportScene {
    ScreenNudgeReport { data in
      ScreenNudgeReportView(data: data)
    }
  }
}
