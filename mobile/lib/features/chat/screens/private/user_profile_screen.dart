import 'package:flutter/material.dart';

class UserProfileScreen extends StatelessWidget {
  final int userId;
  final String userName;
  final String? avatarUrl;

  const UserProfileScreen({
    super.key,
    required this.userId,
    required this.userName,
    this.avatarUrl,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            expandedHeight: 220,
            pinned: true,
            flexibleSpace: FlexibleSpaceBar(
              title: Text(userName),
              background: Container(
                color: isDark ? Colors.black : Colors.blue,
                child: Center(
                  child: CircleAvatar(
                    radius: 50,
                    backgroundColor: Colors.white,
                    backgroundImage: avatarUrl != null
                        ? NetworkImage(avatarUrl!)
                        : null,
                    child: avatarUrl == null
                        ? Text(
                            userName[0].toUpperCase(),
                            style: const TextStyle(
                              fontSize: 40,
                              color: Colors.black,
                            ),
                          )
                        : null,
                  ),
                ),
              ),
            ),
          ),

          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  const SizedBox(height: 10),

                  Text(
                    userName,
                    style: const TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                    ),
                  ),

                  const SizedBox(height: 20),

                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                    children: [
                      _buildButton(
                        icon: Icons.message,
                        label: "Message",
                        onTap: () {
                          Navigator.pop(context);
                        },
                      ),
                      _buildButton(
                        icon: Icons.call,
                        label: "Call",
                        onTap: () {},
                      ),
                      _buildButton(
                        icon: Icons.video_call,
                        label: "Video",
                        onTap: () {},
                      ),
                    ],
                  ),

                  const SizedBox(height: 30),

                  _buildInfoTile(Icons.email, "Email", "user@email.com"),
                  _buildInfoTile(Icons.phone, "Phone", "+123456789"),
                  _buildInfoTile(Icons.info, "Bio", "Hey! I am using your app 🚀"),

                  const SizedBox(height: 20),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildButton({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
  }) {
    return Column(
      children: [
        InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(50),
          child: CircleAvatar(
            radius: 25,
            child: Icon(icon),
          ),
        ),
        const SizedBox(height: 5),
        Text(label),
      ],
    );
  }

  Widget _buildInfoTile(IconData icon, String title, String value) {
    return ListTile(
      leading: Icon(icon),
      title: Text(title),
      subtitle: Text(value),
    );
  }
}