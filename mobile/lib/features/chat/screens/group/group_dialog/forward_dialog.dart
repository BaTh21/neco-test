import 'package:flutter/material.dart';
import 'package:whisper_space_flutter/features/chat/model/chat_model/chat_list_model.dart';

class ForwardDialog extends StatefulWidget {
  final int currentGroupId;
  final int messageId;
  final String messageType;
  final Function(int messageId, Set<int> users, Set<int> groups) onSend;
  final Future<List<ChatListItemModel>> Function() getChats;

  const ForwardDialog({
    Key? key,
    required this.currentGroupId,
    required this.messageId,
    required this.messageType,
    required this.onSend,
    required this.getChats,
  }) : super(key: key);

  @override
  State<ForwardDialog> createState() => _ForwardDialogState();
}

class _ForwardDialogState extends State<ForwardDialog> {
  String selectedFilter = "all";
  final Set<int> selectedUsers = {};
  final Set<int> selectedGroups = {};
  List<ChatListItemModel> chats = [];

  @override
  void initState() {
    super.initState();
    _loadChats();
  }

  Future<void> _loadChats() async {
    final fetchedChats = await widget.getChats();
    setState(() {
      chats = fetchedChats
          .where((c) => !(c.id == widget.currentGroupId && c.type == widget.messageType))
          .toList();
    });
  }

  @override
  Widget build(BuildContext context) {
    final visibleChats = chats.where((chat) {
      if (selectedFilter == "friends") return chat.type == "private";
      if (selectedFilter == "groups") return chat.type == "group";
      return true;
    }).toList();

    return SizedBox(
      height: MediaQuery.of(context).size.height * 0.8,
      child: Column(
        children: [
          const SizedBox(height: 10),
          const Text(
            "Forward to...",
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
          ),
          const Divider(),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            child: Row(
              children: [
                _buildFilterChip("All", "all"),
                const SizedBox(width: 8),
                _buildFilterChip("Friends", "friends"),
                const SizedBox(width: 8),
                _buildFilterChip("Groups", "groups"),
              ],
            ),
          ),
          Expanded(
            child: ListView.builder(
              itemCount: visibleChats.length,
              itemBuilder: (context, index) {
                final chat = visibleChats[index];
                final isSelected = chat.type == 'private'
                    ? selectedUsers.contains(chat.id)
                    : selectedGroups.contains(chat.id);

                return ListTile(
                  tileColor: isSelected ? Colors.blue.withOpacity(0.1) : null,
                  leading: ClipRRect(
                    borderRadius: BorderRadius.circular(chat.type == "group"
                        ? 8
                        : 50), // 8 for groups, circular for private
                    child: Container(
                      width: 40,
                      height: 40,
                      color: chat.avatar == null
                          ? Colors.grey[400]
                          : null, // same placeholder color
                      child: chat.avatar != null
                          ? Image.network(
                              chat.avatar!,
                              fit: BoxFit.cover,
                            )
                          : Center(
                              child: Text(
                                chat.name[0].toUpperCase(),
                                style: const TextStyle(color: Colors.white),
                              ),
                            ),
                    ),
                  ),
                  title: Text(chat.name),
                  subtitle: Text(
                    chat.lastMessage ??
                        (chat.type == "group" ? "Group" : "User"),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 12),
                  ),
                  trailing: Checkbox(
                    value: isSelected,
                    onChanged: (_) {
                      setState(() {
                        if (chat.type == 'private') {
                          isSelected
                              ? selectedUsers.remove(chat.id)
                              : selectedUsers.add(chat.id);
                        } else {
                          isSelected
                              ? selectedGroups.remove(chat.id)
                              : selectedGroups.add(chat.id);
                        }
                      });
                    },
                  ),
                  onTap: () {
                    setState(() {
                      if (chat.type == 'private') {
                        isSelected
                            ? selectedUsers.remove(chat.id)
                            : selectedUsers.add(chat.id);
                      } else {
                        isSelected
                            ? selectedGroups.remove(chat.id)
                            : selectedGroups.add(chat.id);
                      }
                    });
                  },
                );
              },
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(12),
            child: ElevatedButton(
              onPressed: (selectedUsers.isEmpty && selectedGroups.isEmpty)
                  ? null
                  : () {
                      widget.onSend(
                          widget.messageId, selectedUsers, selectedGroups);
                      Navigator.pop(context);
                    },
              child: Text(
                  "Send (${selectedUsers.length + selectedGroups.length})"),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChip(String label, String value) {
    final isSelected = selectedFilter == value;
    return GestureDetector(
      onTap: () => setState(() => selectedFilter = value),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected ? Theme.of(context).primaryColor : Colors.grey[200],
          borderRadius: BorderRadius.circular(2),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isSelected ? Colors.white : Colors.black87,
            fontSize: 13,
          ),
        ),
      ),
    );
  }
}
