import 'package:flutter/material.dart';
import 'package:whisper_space_flutter/services/security_api.dart';

class TwoFactorScreen extends StatefulWidget {
  final SecurityApi securityApi;
  final bool is2FAEnabled;
  final bool isEmail2SAEnabled;

  const TwoFactorScreen({
    super.key,
    required this.securityApi,
    required this.is2FAEnabled,
    required this.isEmail2SAEnabled,
  });

  @override
  State<TwoFactorScreen> createState() => _TwoFactorScreenState();
}

class _TwoFactorScreenState extends State<TwoFactorScreen> {
  late bool _isEmail2SAEnabled;

  // Email 2SA state
  bool _emailLoading = false;
  String? _emailError;
  String? _emailSuccess;

  @override
  void initState() {
    super.initState();
    _isEmail2SAEnabled = widget.isEmail2SAEnabled;
  }

  // ========== Email 2SA Methods ==========
  Future<void> _enableEmail2SA() async {
    setState(() {
      _emailLoading = true;
      _emailError = null;
      _emailSuccess = null;
    });
    try {
      await widget.securityApi.enableEmail2SA();
      setState(() {
        _isEmail2SAEnabled = true;
        _emailSuccess = 'Email two-step authentication enabled';
      });
    } catch (e) {
      setState(() => _emailError = e.toString());
    } finally {
      setState(() => _emailLoading = false);
    }
  }

  Future<void> _disableEmail2SA() async {
    setState(() {
      _emailLoading = true;
      _emailError = null;
      _emailSuccess = null;
    });
    try {
      await widget.securityApi.disableEmail2SA();
      setState(() {
        _isEmail2SAEnabled = false;
        _emailSuccess = 'Email two-step authentication disabled';
      });
    } catch (e) {
      setState(() => _emailError = e.toString());
    } finally {
      setState(() => _emailLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Two-Factor Authentication')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Email 2SA section
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(Icons.email, color: Theme.of(context).primaryColor),
                      const SizedBox(width: 12),
                      const Text('Authentication with Email',
                          style: TextStyle(fontWeight: FontWeight.bold)),
                    ],
                  ),
                  const SizedBox(height: 8),
                  const Text('Receive a verification code by email when logging in'),
                  const SizedBox(height: 12),
                  if (!_isEmail2SAEnabled)
                    ElevatedButton(
                      onPressed: _emailLoading ? null : _enableEmail2SA,
                      child: _emailLoading
                          ? const SizedBox(
                              height: 20,
                              width: 20,
                              child: CircularProgressIndicator(strokeWidth: 2))
                          : const Text('Enable'),
                    )
                  else
                    ElevatedButton(
                      style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
                      onPressed: _emailLoading ? null : _disableEmail2SA,
                      child: _emailLoading
                          ? const SizedBox(
                              height: 20,
                              width: 20,
                              child: CircularProgressIndicator(strokeWidth: 2))
                          : const Text('Disable'),
                    ),
                  // Email feedback
                  if (_emailError != null) ...[
                    const SizedBox(height: 12),
                    Text(_emailError!, style: const TextStyle(color: Colors.red)),
                  ],
                  if (_emailSuccess != null) ...[
                    const SizedBox(height: 12),
                    Text(_emailSuccess!, style: const TextStyle(color: Colors.green)),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}