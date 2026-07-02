class DeviceInfo {
  final int id;
  final String ipAddress;
  final String deviceType;
  final String browser;
  final String os;
  final String deviceName;
  final DateTime lastLogin;

  DeviceInfo({
    required this.id,
    required this.ipAddress,
    required this.deviceType,
    required this.browser,
    required this.os,
    required this.deviceName,
    required this.lastLogin,
  });

  factory DeviceInfo.fromJson(Map<String, dynamic> json) {
    return DeviceInfo(
      id: json['id'],
      ipAddress: json['ip_address'] ?? '',
      deviceType: json['device_type'] ?? 'Unknown',
      browser: json['browser'] ?? 'Unknown',
      os: json['os'] ?? 'Unknown',
      deviceName: json['device_name'] ?? 'Unknown',
      lastLogin: DateTime.parse(json['last_login']),
    );
  }
}