Pod::Spec.new do |s|
  s.name           = 'GuardedAppIcons'
  s.version        = '1.0.1'
  s.summary        = 'Renders privacy-preserving Family Controls activity icons.'
  s.description    = 'An Expo view that renders Apple-provided labels for a FamilyActivitySelection.'
  s.author         = 'ScreenNudge'
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platform       = :ios, '16.4'
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.source_files = '**/*.{h,m,mm,swift,hpp,cpp}'
  s.frameworks = 'FamilyControls', 'ManagedSettings', 'SwiftUI'
  s.swift_version = '5.9'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }
end
