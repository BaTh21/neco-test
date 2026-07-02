class SystemLog {
  final int id;
  final int userId;
  final String action;
  final String? ipAddress;
  final String? userAgent;
  final String? deviceType;
  final String? browser;
  final String? os;
  final String? deviceName;
  final DateTime createdAt;

  SystemLog({
    required this.id,
    required this.userId,
    required this.action,
    this.ipAddress,
    this.userAgent,
    this.deviceType,
    this.browser,
    this.os,
    this.deviceName,
    required this.createdAt,
  });

  factory SystemLog.fromJson(Map<String, dynamic> json) {
    return SystemLog(
      id: json['id'],
      userId: json['user_id'],
      action: json['action'],
      ipAddress: json['ip_address'],
      userAgent: json['user_agent'],
      deviceType: json['device_type'],
      browser: json['browser'],
      os: json['os'],
      deviceName: json['device_name'],
      createdAt: DateTime.parse(json['created_at']),
    );
  }
}