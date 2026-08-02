import ExpoModulesCore

public final class GuardedAppIconsModule: Module {
  public func definition() -> ModuleDefinition {
    Name("GuardedAppIcons")

    View(GuardedAppIconsView.self) {
      Prop("selection") { (view: GuardedAppIconsView, selection: String?) in
        view.serializedSelection = selection
      }

      Prop("maxIcons") { (view: GuardedAppIconsView, maxIcons: Int) in
        view.maxIcons = max(1, maxIcons)
      }
    }
  }
}
