import 'package:flutter/material.dart';

class PublicNoteModel {
  final int id;
  final String title;
  final String? content;
  final Color color;
  final DateTime createdAt;
  final DateTime? updatedAt;

  PublicNoteModel({
    required this.id,
    required this.title,
    this.content,
    required this.color,
    required this.createdAt,
    this.updatedAt,
  });

  factory PublicNoteModel.fromJson(Map<String, dynamic> json) {
    return PublicNoteModel(
      id: json['id'],
      title: json['title'],
      content: json['content'],
      color: _parseColor(json['color'] ?? '#ffffff'),
      createdAt: _parseDateTime(json['created_at']) ?? DateTime.now(),
      updatedAt: _parseDateTime(json['updated_at']),
    );
  }

  static Color _parseColor(String hexColor) {
    try {
      hexColor = hexColor.toUpperCase().replaceAll('#', '');
      if (hexColor.length == 6) hexColor = 'FF$hexColor';
      return Color(int.parse(hexColor, radix: 16));
    } catch (e) {
      return Colors.white;
    }
  }

  static DateTime? _parseDateTime(String? dateTimeString) {
    if (dateTimeString == null) return null;
    return DateTime.tryParse(dateTimeString);
  }
}