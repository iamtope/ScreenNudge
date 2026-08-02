Pod::Spec.new do |s|
  # Deliberately not 'ScreenTimeReport': that name belongs to the report extension
  # target in the app project, and two same-named targets in one workspace clash.
  s.name           = 'ScreenTimeReportView'
  s.version        = '1.0.0'
  s.summary        = 'Hosts the DeviceActivityReport view for ScreenNudge'
  s.description    = 'Embeds the ScreenNudge Device Activity report extension in React Native.'
  s.license        = 'MIT'
  s.author         = ''
  s.homepage       = 'https://github.com/iamtope/screennudge'
  s.platforms      = { :ios => '16.4' }
  s.swift_version  = '5.8'
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = "**/*.{h,m,swift}"
end
