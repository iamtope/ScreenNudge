import ExpoModulesCore

public class ScreenTimeReportModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ScreenTimeReport")

    View(ScreenTimeReportView.self) {
      // Sent together as one prop so a range change is a single re-render rather
      // than two, which would briefly query a start/end from different ranges.
      Prop("range") { (view: ScreenTimeReportView, value: [String]) in
        view.setRange(start: value.first ?? "", end: value.count > 1 ? value[1] : "")
      }
    }
  }
}
