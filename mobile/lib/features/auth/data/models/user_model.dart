class User {
  final int id;
  final String username;
  final String email;
  final bool isVerified;
  final String? avatarUrl;
  final String? bio;
  final bool isOnline;
  final DateTime? lastSeen;
  final DateTime createdAt;
  final DateTime updatedAt;
  final bool is2faEnabled;
  final bool isEmail2saEnabled;

  User({
    required this.id,
    required this.username,
    required this.email,
    required this.isVerified,
    this.avatarUrl,
    this.bio,
    this.isOnline = false,
    this.lastSeen,
    required this.createdAt,
    required this.updatedAt,
    required this.is2faEnabled,
    required this.isEmail2saEnabled,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'] as int,
      username: json['username'] as String,
      email: json['email'] as String,
      isVerified: json['is_verified'] as bool,
      avatarUrl: json['avatar_url'] as String?,
      bio: json['bio'] as String?,
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: DateTime.parse(json['updated_at'] as String),
      isOnline: json['is_online'] as bool? ?? false,
      lastSeen: json['last_seen'] != null
          ? DateTime.parse(json['last_seen'] as String)
          : null,
      is2faEnabled: json['is_2fa_enabled'] as bool? ?? false,
      isEmail2saEnabled: json['is_email_2sa_enabled'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'username': username,
      'email': email,
      'is_verified': isVerified,
      'avatar_url': avatarUrl,
      'bio': bio,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
      'is_online': isOnline,
      'last_seen': lastSeen?.toIso8601String(),
      'is_2fa_enabled': is2faEnabled,
      'is_email_2sa_enabled': isEmail2saEnabled,
    };
  }

  User copyWith({
    int? id,
    String? username,
    String? email,
    bool? isVerified,
    String? avatarUrl,
    String? bio,
    DateTime? createdAt,
    DateTime? updatedAt,
    bool? isOnline,
    DateTime? lastSeen,
    bool? is2faEnabled,
    bool? isEmail2saEnabled,
  }) {
    return User(
      id: id ?? this.id,
      username: username ?? this.username,
      email: email ?? this.email,
      isVerified: isVerified ?? this.isVerified,
      avatarUrl: avatarUrl ?? this.avatarUrl,
      bio: bio ?? this.bio,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      isOnline: isOnline ?? this.isOnline,
      lastSeen: lastSeen ?? this.lastSeen,
      is2faEnabled: is2faEnabled ?? this.is2faEnabled,
      isEmail2saEnabled: isEmail2saEnabled ?? this.isEmail2saEnabled,
    );
  }

  @override
  String toString() {
    return 'User{id: $id, username: $username, email: $email, isVerified: $isVerified, isOnline: $isOnline, is2faEnabled: $is2faEnabled, isEmail2saEnabled: $isEmail2saEnabled}';
  }
}