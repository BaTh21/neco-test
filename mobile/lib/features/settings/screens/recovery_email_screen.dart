import 'package:flutter/material.dart';
import 'package:whisper_space_flutter/services/security_api.dart';

class RecoveryEmailScreen extends StatefulWidget {
  final SecurityApi securityApi;
  final String currentEmail;
  const RecoveryEmailScreen(
      {super.key, required this.securityApi, required this.currentEmail});

  @override
  State<RecoveryEmailScreen> createState() => _RecoveryEmailScreenState();
}

class _RecoveryEmailScreenState extends State<RecoveryEmailScreen> {
  int _step = 1;
  String _newEmail = '';
  String _code = '';
  bool _loading = false;
  String? _error;
  String? _success;
  int _timeLeft = 0;
  DateTime? _codeSentAt;

  final TextEditingController _emailController = TextEditingController();
  final List<TextEditingController> _codeControllers =
      List.generate(6, (_) => TextEditingController());

  @override
  void dispose() {
    _emailController.dispose();
    for (var c in _codeControllers) c.dispose();
    super.dispose();
  }

  Future<void> _requestCode() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      await widget.securityApi.requestEmailChange(_newEmail);
      setState(() {
        _step = 2;
        _codeSentAt = DateTime.now();
        _timeLeft = 600; // 10 minutes
        _startTimer();
      });
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      setState(() => _loading = false);
    }
  }

  void _startTimer() {
    Future.doWhile(() async {
      await Future.delayed(const Duration(seconds: 1));
      if (!mounted) return false;
      final elapsed = DateTime.now().difference(_codeSentAt!).inSeconds;
      final remaining = 600 - elapsed;
      if (remaining <= 0) {
        setState(() {
          _step = 1;
          _timeLeft = 0;
          _error = 'Verification code expired. Please request a new one.';
        });
        return false;
      }
      setState(() => _timeLeft = remaining);
      return true;
    });
  }

  Future<void> _verifyCode() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      await widget.securityApi.verifyEmailChange(_newEmail, _code);
      setState(() {
        _success = 'Email changed successfully. Please log in again.';
        _step = 1;
        _newEmail = '';
        _emailController.clear();
        for (var c in _codeControllers) c.clear();
      });
      // Optionally logout and force re-login
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Change Email')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            if (_step == 1) ...[
              TextField(
                controller: _emailController,
                decoration:
                    const InputDecoration(labelText: 'New Email Address'),
                keyboardType: TextInputType.emailAddress,
                onChanged: (v) => setState(() {
                  _newEmail = v.trim();
                }),
              ),
              const SizedBox(height: 16),
              if (_error != null)
                Text(_error!, style: const TextStyle(color: Colors.red)),
              ElevatedButton(
                onPressed: _loading ||
                        _newEmail.isEmpty ||
                        _newEmail == widget.currentEmail
                    ? null
                    : _requestCode,
                child: _loading
                    ? const CircularProgressIndicator()
                    : const Text('Send Verification Code'),
              ),
            ] else ...[
              Text('Enter 6-digit verification code sent to $_newEmail'),
              const SizedBox(height: 16),
              if (_timeLeft > 0)
                Text(
                    'Code expires in ${_timeLeft ~/ 60}:${(_timeLeft % 60).toString().padLeft(2, '0')}',
                    style: const TextStyle(fontSize: 12)),
              const SizedBox(height: 8),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(
                    6,
                    (i) => Container(
                          width: 50,
                          margin: const EdgeInsets.symmetric(horizontal: 4),
                          child: TextField(
                            controller: _codeControllers[i],
                            textAlign: TextAlign.center,
                            maxLength: 1,
                            keyboardType: TextInputType.number,
                            decoration: const InputDecoration(counterText: ''),
                            onChanged: (v) {
                              if (v.length == 1 && i < 5) {
                                FocusScope.of(context).nextFocus();
                              }
                              _code =
                                  _codeControllers.map((c) => c.text).join();
                            },
                          ),
                        )),
              ),
              const SizedBox(height: 16),
              if (_error != null)
                Text(_error!, style: const TextStyle(color: Colors.red)),
              if (_success != null)
                Text(_success!, style: const TextStyle(color: Colors.green)),
              ElevatedButton(
                onPressed: _loading || _code.length != 6 ? null : _verifyCode,
                child: _loading
                    ? const CircularProgressIndicator()
                    : const Text('Verify & Change Email'),
              ),
              TextButton(
                onPressed: () => setState(() => _step = 1),
                child: const Text('Change Email Address'),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
