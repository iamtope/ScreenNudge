import ExpoModulesCore
import FamilyControls
import ManagedSettings
import SwiftUI
import UIKit

final class GuardedAppIconsView: ExpoView {
  private let hostingController: UIHostingController<AnyView>

  var serializedSelection: String? {
    didSet {
      render()
    }
  }

  var maxIcons = 4 {
    didSet {
      render()
    }
  }

  required init(appContext: AppContext? = nil) {
    hostingController = UIHostingController(rootView: AnyView(EmptyView()))
    super.init(appContext: appContext)

    clipsToBounds = true
    backgroundColor = .clear
    isUserInteractionEnabled = false
    hostingController.view.backgroundColor = .clear
    hostingController.view.isUserInteractionEnabled = false
    addSubview(hostingController.view)
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    hostingController.view.frame = bounds
  }

  override func didMoveToWindow() {
    super.didMoveToWindow()

    if window != nil {
      if hostingController.parent == nil, let parent = parentViewController {
        parent.addChild(hostingController)
        hostingController.didMove(toParent: parent)
      }
    } else if hostingController.parent != nil {
      hostingController.willMove(toParent: nil)
      hostingController.removeFromParent()
    }
  }

  private var parentViewController: UIViewController? {
    var responder: UIResponder? = self
    while let next = responder?.next {
      if let viewController = next as? UIViewController {
        return viewController
      }
      responder = next
    }
    return nil
  }

  private func render() {
    guard
      let serializedSelection,
      let data = Data(base64Encoded: serializedSelection),
      let selection = try? JSONDecoder().decode(FamilyActivitySelection.self, from: data)
    else {
      hostingController.rootView = AnyView(EmptyView())
      return
    }

    hostingController.rootView = AnyView(
      GuardedActivityIconRow(selection: selection, maxIcons: maxIcons)
    )
  }
}

private struct GuardedActivityIconRow: View {
  let selection: FamilyActivitySelection
  let maxIcons: Int

  private var applications: [ApplicationToken] {
    Array(selection.applicationTokens.prefix(maxIcons))
  }

  private var categories: [ActivityCategoryToken] {
    let available = max(0, maxIcons - applications.count)
    return Array(selection.categoryTokens.prefix(available))
  }

  private var webDomains: [WebDomainToken] {
    let available = max(0, maxIcons - applications.count - categories.count)
    return Array(selection.webDomainTokens.prefix(available))
  }

  var body: some View {
    HStack(spacing: 4) {
      ForEach(applications, id: \.self) { token in
        Label(token)
          .labelStyle(.iconOnly)
          .frame(width: 32, height: 32)
      }

      ForEach(categories, id: \.self) { token in
        Label(token)
          .labelStyle(.iconOnly)
          .frame(width: 32, height: 32)
      }

      ForEach(webDomains, id: \.self) { token in
        Label(token)
          .labelStyle(.iconOnly)
          .frame(width: 32, height: 32)
      }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
  }
}
