import 'package:flutter/material.dart';
import 'package:whisper_space_flutter/features/auth/data/models/device_info.dart';
import 'package:whisper_space_flutter/features/auth/data/models/system_log.dart';
import 'package:whisper_space_flutter/services/security_api.dart';



class LoginDetailsScreen extends StatefulWidget {
  final SecurityApi securityApi;
  const LoginDetailsScreen({super.key, required this.securityApi});

  @override
  State<LoginDetailsScreen> createState() => _LoginDetailsScreenState();
}

class _LoginDetailsScreenState extends State<LoginDetailsScreen> {
  late Future<List<SystemLog>> _logsFuture;
  late Future<List<DeviceInfo>> _devicesFuture;

  @override
  void initState() {
    super.initState();
    _logsFuture = widget.securityApi.getUserLogs();
    _devicesFuture = widget.securityApi.getUserDevices();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Login Details')),
      body: DefaultTabController(
        length: 2,
        child: Column(
          children: [
            const TabBar(
              tabs: [
                Tab(text: 'Devices'),
                Tab(text: 'Activity Logs'),
              ],
            ),
            Expanded(
              child: TabBarView(
                children: [
                  _buildDevicesList(),
                  _buildLogsList(),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDevicesList() {
    return FutureBuilder<List<DeviceInfo>>(
      future: _devicesFuture,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }
        if (snapshot.hasError) {
          return Center(child: Text('Error: ${snapshot.error}'));
        }
        final devices = snapshot.data!;
        if (devices.isEmpty) {
          return const Center(child: Text('No devices found'));
        }
        return ListView.builder(
          itemCount: devices.length,
          itemBuilder: (context, index) {
            final device = devices[index];
            return ListTile(
              leading: Icon(_deviceIcon(device.deviceType)),
              title: Text(device.deviceName),
              subtitle: Text('${device.os} · ${device.browser}'),
              trailing: Text(
                _formatDate(device.lastLogin),
                style: const TextStyle(fontSize: 12),
              ),
            );
          },
        );
      },
    );
  }

  Widget _buildLogsList() {
    return FutureBuilder<List<SystemLog>>(
      future: _logsFuture,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }
        if (snapshot.hasError) {
          return Center(child: Text('Error: ${snapshot.error}'));
        }
        final logs = snapshot.data!;
        if (logs.isEmpty) {
          return const Center(child: Text('No activity logs'));
        }
        return ListView.builder(
          itemCount: logs.length,
          itemBuilder: (context, index) {
            final log = logs[index];
            return ListTile(
              leading: Icon(_actionIcon(log.action)),
              title: Text(log.action),
              subtitle: Text('${log.ipAddress ?? 'Unknown IP'} · ${log.deviceType ?? ''}'),
              trailing: Text(_formatDate(log.createdAt)),
              isThreeLine: true,
            );
          },
        );
      },
    );
  }

  IconData _deviceIcon(String type) {
    switch (type.toLowerCase()) {
      case 'mobile':
        return Icons.phone_android;
      case 'tablet':
        return Icons.tablet_android;
      default:
        return Icons.computer;
    }
  }

  IconData _actionIcon(String action) {
    switch (action) {
      case 'login':
        return Icons.login;
      case 'logout':
        return Icons.logout;
      case 'change_password':
        return Icons.lock;
      default:
        return Icons.info;
    }
  }

  String _formatDate(DateTime date) {
    return '${date.day}/${date.month}/${date.year} ${date.hour}:${date.minute.toString().padLeft(2, '0')}';
  }
}