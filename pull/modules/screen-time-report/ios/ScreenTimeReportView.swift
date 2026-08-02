import DeviceActivity
import ExpoModulesCore
import SwiftUI

/// Must match `DeviceActivityReport.Context.screenNudge` in the report extension.
/// The extension and the app are separate targets, so the string is the contract.
private let reportContext = DeviceActivityReport.Context("ScreenNudge Report")

class ScreenTimeReportView: ExpoView {
  private var hostingController: UIHostingController<AnyView>?
  /// Inclusive local day bounds, "YYYY-MM-DD". The framework accepts any interval,
  /// so the range is decided in JS rather than baked in here.
  private var startDay = ""
  private var endDay = ""

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    clipsToBounds = true
    render()
  }

  func setRange(start: String, end: String) {
    guard start != startDay || end != endDay else { return }
    startDay = start
    endDay = end
    render()
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    hostingController?.view.frame = bounds
  }

  // Deliberately no hitTest override: the report scrolls itself now, so it needs its
  // own touches. Blocking them was an attempt to stop it fighting a surrounding
  // ScrollView — the fix for that is to not put it in one.

  override func didMoveToWindow() {
    super.didMoveToWindow()
    attachToParentViewController()
  }

  /// DeviceActivityReport renders out-of-process, so the hosting controller has to be
  /// a real child view controller — without containment it never gets the lifecycle
  /// events the remote view needs and stays blank.
  private func attachToParentViewController() {
    guard let hostingController, hostingController.parent == nil,
          let parent = closestViewController() else { return }
    parent.addChild(hostingController)
    hostingController.didMove(toParent: parent)
  }

  private func closestViewController() -> UIViewController? {
    var responder: UIResponder? = self
    while let next = responder?.next {
      if let controller = next as? UIViewController { return controller }
      responder = next
    }
    return nil
  }

  private func day(from key: String) -> Date? {
    let parts = key.split(separator: "-").compactMap { Int($0) }
    guard parts.count == 3 else { return nil }
    var components = DateComponents()
    components.year = parts[0]
    components.month = parts[1]
    components.day = parts[2]
    return Calendar.current.date(from: components)
  }

  private func currentFilter() -> DeviceActivityFilter {
    let calendar = Calendar.current
    let now = Date()
    let startOfToday = calendar.startOfDay(for: now)

    let start = day(from: startDay).map { calendar.startOfDay(for: $0) } ?? startOfToday
    // End of the chosen day, or now when that day is today — asking for the future
    // returns nothing.
    let requestedEnd = day(from: endDay).map { calendar.startOfDay(for: $0) } ?? startOfToday
    let endExclusive = calendar.date(byAdding: .day, value: 1, to: requestedEnd) ?? now
    let end = min(endExclusive, max(now, calendar.date(byAdding: .second, value: 1, to: start) ?? now))

    // Always hourly: it is the finest interval the framework offers, and it is what
    // makes the pickups-per-hour chart possible. Over a multi-day range the hours
    // fold together into a by-hour-of-day view, which is what we want.
    return DeviceActivityFilter(
      segment: .hourly(during: DateInterval(start: start, end: max(end, start))),
      users: .all,
      devices: .init([.iPhone])
    )
  }

  private func render() {
    if let existing = hostingController {
      existing.willMove(toParent: nil)
      existing.view.removeFromSuperview()
      existing.removeFromParent()
    }

    let report = DeviceActivityReport(reportContext, filter: currentFilter())
    let controller = UIHostingController(rootView: AnyView(report))
    controller.view.backgroundColor = .clear
    controller.view.frame = bounds
    addSubview(controller.view)
    hostingController = controller
    attachToParentViewController()
  }
}
