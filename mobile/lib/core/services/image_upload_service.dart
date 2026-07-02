import 'dart:convert';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';
import 'package:image_picker/image_picker.dart';
import 'package:path/path.dart';
import 'package:path_provider/path_provider.dart';

class ImageUploadService {
  final ImagePicker _picker = ImagePicker();
  final String _baseUrl;

  ImageUploadService({required String baseUrl}) : _baseUrl = baseUrl;

  Future<File?> pickImage(ImageSource source) async {
    try {
      final XFile? pickedFile = await _picker.pickImage(
        source: source,
        maxWidth: 1024,
        maxHeight: 1024,
        imageQuality: 85,
      );

      if (pickedFile != null) {
        final directory = await getApplicationDocumentsDirectory();
        final fileName = basename(pickedFile.path);
        final savedPath = '${directory.path}/profile_images/$fileName';
        
        final dir = Directory('${directory.path}/profile_images');
        if (!await dir.exists()) {
          await dir.create(recursive: true);
        }
        
        final savedFile = await File(pickedFile.path).copy(savedPath);
        return savedFile;
      }
      return null;
    } catch (e) {
      debugPrint('Error picking image: $e');
      return null;
    }
  }

  Future<String?> uploadProfileImage(File imageFile, String token) async {
    try {
      final url = Uri.parse('$_baseUrl/upload');
      debugPrint('Uploading to: $url');
      debugPrint('Token: $token');

      var request = http.MultipartRequest('POST', url);
      request.headers['Authorization'] = 'Bearer $token';

      request.files.add(
        await http.MultipartFile.fromPath(
          'avatar',
          imageFile.path,
          contentType: MediaType('image', 'jpeg'),
        ),
      );

      var streamedResponse = await request.send();
      var response = await http.Response.fromStream(streamedResponse);

      debugPrint('Response status: ${response.statusCode}');
      debugPrint('Response body: ${response.body}');

      if (response.statusCode == 200) {
        try {
          var data = json.decode(response.body);
          return data['avatar_url'];
        } catch (e) {
          debugPrint('Failed to decode JSON: $e');
          throw Exception('Invalid server response: ${response.body}');
        }
      } else {
        String errorMessage;
        try {
          var error = json.decode(response.body);
          errorMessage = error['detail'] ?? 'Unknown error';
        } catch (e) {
          errorMessage = response.reasonPhrase ?? 'HTTP ${response.statusCode}';
        }
        throw Exception('Upload failed: $errorMessage');
      }
    } catch (e) {
      debugPrint('Error uploading profile image: $e');
      rethrow;
    }
  }


  Future<bool> deleteProfileImage(String token) async {
    try {
      final response = await http.delete(
        Uri.parse('$_baseUrl/delete'), 
        headers: {
          'Authorization': 'Bearer $token',
        },
      );
      debugPrint('Delete response: ${response.statusCode}');
      return response.statusCode == 200;
    } catch (e) {
      debugPrint('Error deleting profile image: $e');
      return false;
    }
  }
}