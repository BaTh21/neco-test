import 'package:flutter/material.dart';
import 'package:provider/provider.dart';   
import 'package:url_launcher/url_launcher.dart';
import 'dart:convert';

import 'package:whisper_space_flutter/core/services/api_service.dart';
import 'package:whisper_space_flutter/core/services/auth_service.dart';

class HelpSupportScreen extends StatefulWidget {
  const HelpSupportScreen({super.key});

  @override
  State<HelpSupportScreen> createState() => _HelpSupportScreenState();
}

class _HelpSupportScreenState extends State<HelpSupportScreen> {
  final _problemController = TextEditingController();
  final _emailController = TextEditingController();
  bool _isSubmitting = false;

  late final ApiService _apiService;
  late final AuthService _authService;

  final List<FaqItem> _faqItems = [
    FaqItem(
      question: 'How do I reset my password?',
      answer: 'Go to Login screen → Forgot Password → Follow the instructions sent to your email.',
    ),
    FaqItem(
      question: 'How can I change my email address?',
      answer: 'Navigate to Settings → Privacy & Security → Change Email. You will need to verify the new email.',
    ),
    FaqItem(
      question: 'What is Two-Factor Authentication?',
      answer: '2FA adds an extra layer of security. After enabling, you will need a TOTP code from an authenticator app to log in.',
    ),
    FaqItem(
      question: 'How do I delete my account?',
      answer: 'Go to Settings → Privacy & Security → Deactivate Account. This action is irreversible.',
    ),
    FaqItem(
      question: 'My messages are not sending. What should I do?',
      answer: 'Check your internet connection. If the problem persists, contact support using the form below.',
    ),
  ];

  @override
  void initState() {
    super.initState();
    _apiService = ApiService();
    _authService = context.read<AuthService>();
  }

  @override
  void dispose() {
    _problemController.dispose();
    _emailController.dispose();
    super.dispose();
  }

  Future<void> _contactSupport() async {
    final userName = _authService.getSavedUsername();

    final nameController = TextEditingController(text: userName ?? '');
    final emailController = TextEditingController();
    final messageController = TextEditingController();

    final shouldSend = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Contact Support'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: nameController,
                decoration: const InputDecoration(
                  labelText: 'Your Name',
                  hintText: 'Enter your name',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: emailController,
                decoration: const InputDecoration(
                  labelText: 'Your Email *',
                  border: OutlineInputBorder(),
                ),
                keyboardType: TextInputType.emailAddress,
              ),
              const SizedBox(height: 12),
              TextField(
                controller: messageController,
                decoration: const InputDecoration(
                  labelText: 'Message *',
                  border: OutlineInputBorder(),
                ),
                maxLines: 4,
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Send'),
          ),
        ],
      ),
    );

    if (shouldSend != true) return;

    final name = nameController.text.trim();
    final email = emailController.text.trim();
    final message = messageController.text.trim();

    if (email.isEmpty || message.isEmpty) {
      if (mounted) _showSnackBar('Please provide email and message');
      return;
    }

    setState(() => _isSubmitting = true);

    try {
      final response = await _apiService.post(
        '/api/v1/contact-support',
        {
          'name': name.isEmpty ? null : name,
          'email': email,
          'message': message,
        },
      );

      if (!mounted) return;

      if (response.statusCode == 200) {
        _showSnackBar('Message sent! We\'ll get back to you soon.');
        Navigator.pop(context);
      } else {
        _showSnackBar('Failed to send. Please try again later.');
      }
    } catch (e) {
      if (mounted) _showSnackBar('Network error. Please check your connection.');
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  Future<void> _reportProblem() async {
    if (_problemController.text.trim().isEmpty) {
      _showSnackBar('Please describe the problem');
      return;
    }

    setState(() => _isSubmitting = true);

    try {
      final response = await _apiService.post(
        '/api/v1/report-problem',
        {
          'problem': _problemController.text,
          'email': _emailController.text.trim().isEmpty ? null : _emailController.text,
        },
      );

      if (!mounted) return;

      if (response.statusCode == 200) {
        _showSnackBar('Thank you! Our team will review your report.');
        _problemController.clear();
        _emailController.clear();
      } else {
        String errorMsg = 'Failed to send report. Please try again.';
        try {
          final body = jsonDecode(response.body);
          errorMsg = body['detail'] ?? errorMsg;
        } catch (_) {}
        _showSnackBar(errorMsg);
      }
    } catch (e) {
      if (mounted) _showSnackBar('Network error. Please check your connection.');
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  void _showSnackBar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), backgroundColor: Colors.green),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Help & Support')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            elevation: 2,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Padding(
                  padding: EdgeInsets.all(16),
                  child: Text(
                    'Frequently Asked Questions',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                ),
                const Divider(height: 0),
                // Removed unnecessary .toList()
                ..._faqItems.map((item) => _buildFaqTile(item)),
              ],
            ),
          ),
          const SizedBox(height: 16),
          Card(
            elevation: 2,
            child: ListTile(
              leading: const Icon(Icons.email, color: Colors.blue),
              title: const Text('Contact Support via Email'),
              subtitle: const Text('Send an email to our support team'),
              onTap: _contactSupport,
            ),
          ),
          const SizedBox(height: 16),
          Card(
            elevation: 2,
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Report a Problem',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _emailController,
                    decoration: const InputDecoration(
                      labelText: 'Your Email (optional)',
                      hintText: 'We may contact you for updates',
                      border: OutlineInputBorder(),
                    ),
                    keyboardType: TextInputType.emailAddress,
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _problemController,
                    decoration: const InputDecoration(
                      labelText: 'Describe the problem *',
                      hintText: 'What went wrong?',
                      border: OutlineInputBorder(),
                    ),
                    maxLines: 4,
                  ),
                  const SizedBox(height: 16),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: _isSubmitting ? null : _reportProblem,
                      icon: _isSubmitting
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Icon(Icons.send),
                      label: Text(_isSubmitting ? 'Submitting...' : 'Submit Report'),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFaqTile(FaqItem item) {
    return ExpansionTile(
      title: Text(item.question, style: const TextStyle(fontWeight: FontWeight.w500)),
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
          child: Text(item.answer, style: const TextStyle(fontSize: 14)),
        ),
      ],
    );
  }
}

class FaqItem {
  final String question;
  final String answer;
  FaqItem({required this.question, required this.answer});
}