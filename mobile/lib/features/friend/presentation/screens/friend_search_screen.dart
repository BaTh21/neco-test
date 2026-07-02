import 'package:flutter/material.dart';
import 'package:whisper_space_flutter/core/services/storage_service.dart';
import 'package:whisper_space_flutter/utils/snack_bar.dart';

import '../datasources/friend_api_source.dart';

enum FriendshipStatus {
  none,
  pending,
  accepted,
  blocked,
}

class AddFriendScreen extends StatefulWidget {
  const AddFriendScreen({super.key});

  @override
  State<AddFriendScreen> createState() => _AddFriendScreenState();
}

class _AddFriendScreenState extends State<AddFriendScreen> {
  final TextEditingController _searchController = TextEditingController();
  final FocusNode _searchFocusNode = FocusNode();
  final ScrollController _scrollController = ScrollController();

  late FriendAPISource friendApi;

  List<Map<String, dynamic>> suggestions = [];
  List<Map<String, dynamic>> searchResults = [];
  bool isLoading = true;
  bool isSearching = false;
  bool hasSearched = false;
  String? errorMessage;

  @override
  void initState() {
    super.initState();
    _initializeApi();

    WidgetsBinding.instance.addPostFrameCallback((_) {
      _searchFocusNode.requestFocus();
    });
  }

  Future<void> _initializeApi() async {
    final storageService = StorageService();
    await storageService.init();

    friendApi = FriendAPISource(storageService: storageService);
    await _loadSuggestions();
  }

  Future<void> _loadSuggestions() async {
    if (!mounted) return;

    setState(() {
      isLoading = true;
      errorMessage = null;
      isSearching = false;
      hasSearched = false;
    });

    try {
      final results = await friendApi.getFriendSuggestions(limit: 20);
      if (mounted) {
        setState(() {
          suggestions = List<Map<String, dynamic>>.from(results);
          isLoading = false;
        });
      }
    } catch (e) {
      debugPrint('Error loading suggestions: $e');
      if (mounted) {
        setState(() {
          isLoading = false;
          errorMessage = e.toString().replaceAll('Exception: ', '');
        });
      }
    }
  }

  Future<void> _performSearch() async {
    final query = _searchController.text.trim();
    if (query.isEmpty) {
      setState(() {
        hasSearched = false;
        searchResults.clear();
        isSearching = false;
      });
      return;
    }

    setState(() {
      isSearching = true;
      hasSearched = true;
      errorMessage = null;
    });

    try {
      final results = await friendApi.searchUsers(query);
      if (mounted) {
        setState(() {
          searchResults = List<Map<String, dynamic>>.from(results);
          isSearching = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          isSearching = false;
          errorMessage = e.toString().replaceAll('Exception: ', '');
        });
      }
    }
  }

  Future<void> _handleAddFriend(int userId, String username) async {
    try {
      final response = await friendApi.addFriend(userId);

      if (mounted) {
        showTopSnackBar(
          context,
          response['msg'] ?? 'Friend request sent to $username',
          backgroundColor: Colors.green,
        );

        await _loadSuggestions();
        if (hasSearched) {
          await _performSearch();
        }
      }
    } catch (e) {
      if (mounted) {
        showTopSnackBar(
          context,
          e.toString().replaceAll('Exception: ', ''),
          backgroundColor: Colors.red,
        );
      }
    }
  }

  Widget _buildMutualFriendsChip(int count) {
    final isDarkMode = Theme.of(context).brightness == Brightness.dark;

    if (count == 0) return const SizedBox.shrink();

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: isDarkMode ? Colors.grey[800] : Colors.grey.shade200,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            Icons.people,
            size: 12,
            color: isDarkMode ? Colors.white70 : Colors.grey[600],
          ),
          const SizedBox(width: 4),
          Text(
            '$count mutual ${count == 1 ? 'friend' : 'friends'}',
            style: TextStyle(
              fontSize: 10,
              color: isDarkMode ? Colors.white70 : Colors.grey[600],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatusBadge(String? status) {
    final isDarkMode = Theme.of(context).brightness == Brightness.dark;

    if (status == null) return const SizedBox.shrink();

    switch (status.toLowerCase()) {
      case 'accepted':
        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
          decoration: BoxDecoration(
            color: isDarkMode ? Colors.green[900] : Colors.green.shade50,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: isDarkMode ? Colors.green[700]! : Colors.green.shade200,
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.check_circle, size: 14, color: Colors.green),
              const SizedBox(width: 4),
              Text(
                'Friends',
                style: TextStyle(
                  color: isDarkMode ? Colors.green[300] : Colors.green.shade700,
                  fontWeight: FontWeight.bold,
                  fontSize: 12,
                ),
              ),
            ],
          ),
        );

      case 'pending':
        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
          decoration: BoxDecoration(
            color: isDarkMode ? Colors.orange[900] : Colors.orange.shade50,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: isDarkMode ? Colors.orange[700]! : Colors.orange.shade200,
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.hourglass_empty, size: 14, color: Colors.orange),
              const SizedBox(width: 4),
              Text(
                'Pending',
                style: TextStyle(
                  color: isDarkMode ? Colors.orange[300] : Colors.orange.shade700,
                  fontWeight: FontWeight.bold,
                  fontSize: 12,
                ),
              ),
            ],
          ),
        );

      case 'blocked':
        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
          decoration: BoxDecoration(
            color: isDarkMode ? Colors.grey[800] : Colors.grey.shade100,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: isDarkMode ? Colors.grey[700]! : Colors.grey.shade300,
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                Icons.block,
                size: 14,
                color: isDarkMode ? Colors.white70 : Colors.grey[600],
              ),
              const SizedBox(width: 4),
              Text(
                'Blocked',
                style: TextStyle(
                  color: isDarkMode ? Colors.white70 : Colors.grey[600],
                  fontWeight: FontWeight.bold,
                  fontSize: 12,
                ),
              ),
            ],
          ),
        );

      default:
        return const SizedBox.shrink();
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDarkMode = Theme.of(context).brightness == Brightness.dark;
    final textColor = isDarkMode ? Colors.white : Colors.black;
    final appBarTextColor = isDarkMode ? Colors.white : Colors.black;
    final appBarIconColor = isDarkMode ? Colors.white : Colors.black;
    final subtitleColor = isDarkMode ? Colors.white70 : Colors.grey[600];
    final hintColor = isDarkMode ? Colors.white54 : Colors.grey[500];
    final iconColor = isDarkMode ? Colors.white70 : Colors.grey[600];
    final inputFillColor = isDarkMode ? const Color(0xFF2C2C2C) : Colors.grey.shade100;
    final scaffoldBgColor = isDarkMode ? const Color(0xFF121212) : Colors.white;

    return Scaffold(
      backgroundColor: scaffoldBgColor,
      appBar: AppBar(
        title: Text(
          'Add Friends',
          style: TextStyle(
            color: appBarTextColor,
            fontWeight: FontWeight.w600,
          ),
        ),
        backgroundColor: isDarkMode ? const Color(0xFF1E1E1E) : Colors.white,
        elevation: 0,
        iconTheme: IconThemeData(
          color: appBarIconColor,
        ),
        actions: [
          IconButton(
            icon: Icon(Icons.refresh, color: appBarIconColor),
            onPressed: _loadSuggestions,
          ),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: TextField(
              controller: _searchController,
              focusNode: _searchFocusNode,
              style: TextStyle(
                color: textColor,
                fontSize: 16,
              ),
              decoration: InputDecoration(
                hintText: 'Search by username or email...',
                hintStyle: TextStyle(
                  color: hintColor,
                  fontSize: 14,
                ),
                prefixIcon: Icon(
                  Icons.search,
                  color: iconColor,
                ),
                suffixIcon: _searchController.text.isNotEmpty
                    ? IconButton(
                        icon: Icon(
                          Icons.clear,
                          color: iconColor,
                        ),
                        onPressed: () {
                          _searchController.clear();
                          setState(() {
                            hasSearched = false;
                            searchResults.clear();
                          });
                          _searchFocusNode.requestFocus();
                        },
                      )
                    : null,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide.none,
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide.none,
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(
                    color: Theme.of(context).primaryColor,
                    width: 2,
                  ),
                ),
                filled: true,
                fillColor: inputFillColor,
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 14,
                ),
              ),
              onSubmitted: (_) => _performSearch(),
              textInputAction: TextInputAction.search,
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: isSearching ? null : _performSearch,
                style: ElevatedButton.styleFrom(
                  backgroundColor: Theme.of(context).primaryColor,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: isSearching
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Text('Search'),
              ),
            ),
          ),
          Expanded(
            child: hasSearched ? _buildSearchResults() : _buildSuggestions(),
          ),
        ],
      ),
    );
  }

  Widget _buildSearchResults() {
    final isDarkMode = Theme.of(context).brightness == Brightness.dark;
    final textColor = isDarkMode ? Colors.white : Colors.black;
    final subtitleColor = isDarkMode ? Colors.white70 : Colors.grey[600];
    final hintColor = isDarkMode ? Colors.white54 : Colors.grey[500];

    if (isSearching) {
      return const Center(child: CircularProgressIndicator());
    }

    if (errorMessage != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.error_outline,
              size: 64,
              color: isDarkMode ? Colors.red[300] : Colors.red.shade300,
            ),
            const SizedBox(height: 16),
            Text(
              errorMessage!,
              style: TextStyle(
                color: isDarkMode ? Colors.red[300] : Colors.red,
                fontSize: 14,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: _performSearch,
              style: ElevatedButton.styleFrom(
                backgroundColor: Theme.of(context).primaryColor,
              ),
              child: const Text('Try Again'),
            ),
          ],
        ),
      );
    }

    if (searchResults.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.person_search,
              size: 80,
              color: isDarkMode ? Colors.white38 : Colors.grey.shade400,
            ),
            const SizedBox(height: 16),
            Text(
              'No users found for "${_searchController.text}"',
              style: TextStyle(
                color: subtitleColor,
                fontSize: 16,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              'Try a different search term',
              style: TextStyle(
                color: hintColor,
                fontSize: 14,
              ),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      controller: _scrollController,
      padding: const EdgeInsets.all(16),
      itemCount: searchResults.length,
      itemBuilder: (context, index) {
        final user = searchResults[index];
        final status = user['friendship_status'];
        final isOnline = user['is_online'] ?? false;
        final mutualCount = user['mutual_friends_count'] ?? 0;

        return Card(
          margin: const EdgeInsets.only(bottom: 12),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          color: isDarkMode ? const Color(0xFF1E1E1E) : Colors.white,
          child: ListTile(
            contentPadding: const EdgeInsets.all(12),
            leading: Stack(
              children: [
                CircleAvatar(
                  radius: 28,
                  backgroundColor: isDarkMode ? Colors.grey[800] : Colors.blueGrey,
                  backgroundImage: user['avatar_url'] != null &&
                      user['avatar_url'].toString().isNotEmpty
                      ? NetworkImage(user['avatar_url'])
                      : null,
                  child: user['avatar_url'] == null ||
                      user['avatar_url'].toString().isEmpty
                      ? Text(
                          user['username'][0].toUpperCase(),
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                            fontSize: 18,
                          ),
                        )
                      : null,
                ),
                if (isOnline)
                  Positioned(
                    bottom: 0,
                    right: 0,
                    child: Container(
                      width: 12,
                      height: 12,
                      decoration: BoxDecoration(
                        color: Colors.green,
                        shape: BoxShape.circle,
                        border: Border.all(color: Colors.white, width: 2),
                      ),
                    ),
                  ),
              ],
            ),
            title: Row(
              children: [
                Expanded(
                  child: Text(
                    user['username'],
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                      color: textColor,
                    ),
                  ),
                ),
                _buildMutualFriendsChip(mutualCount),
              ],
            ),
            subtitle: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  user['email'],
                  style: TextStyle(
                    color: subtitleColor,
                    fontSize: 13,
                  ),
                ),
                if (mutualCount > 0) const SizedBox(height: 4),
              ],
            ),
            trailing: status != null
                ? _buildStatusBadge(status)
                : SizedBox(
                    width: 70,
                    child: ElevatedButton(
                      onPressed: () => _handleAddFriend(
                        user['id'],
                        user['username'],
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Theme.of(context).primaryColor,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(20),
                        ),
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 8,
                        ),
                      ),
                      child: const Text(
                        'Add',
                        style: TextStyle(fontSize: 12),
                      ),
                    ),
                  ),
          ),
        );
      },
    );
  }

  Widget _buildSuggestions() {
    final isDarkMode = Theme.of(context).brightness == Brightness.dark;
    final textColor = isDarkMode ? Colors.white : Colors.black;
    final subtitleColor = isDarkMode ? Colors.white70 : Colors.grey[600];
    final hintColor = isDarkMode ? Colors.white54 : Colors.grey[500];

    if (isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (errorMessage != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.error_outline,
              size: 64,
              color: isDarkMode ? Colors.red[300] : Colors.red.shade300,
            ),
            const SizedBox(height: 16),
            Text(
              errorMessage!,
              style: TextStyle(
                color: isDarkMode ? Colors.red[300] : Colors.red,
                fontSize: 14,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: _loadSuggestions,
              style: ElevatedButton.styleFrom(
                backgroundColor: Theme.of(context).primaryColor,
              ),
              child: const Text('Try Again'),
            ),
          ],
        ),
      );
    }

    if (suggestions.isEmpty) {
      return RefreshIndicator(
        onRefresh: _loadSuggestions,
        child: ListView(
          children: [
            SizedBox(
              height: MediaQuery.of(context).size.height * 0.3,
            ),
            Center(
              child: Column(
                children: [
                  Icon(
                    Icons.people_outline,
                    size: 80,
                    color: isDarkMode ? Colors.white38 : Colors.grey.shade400,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'No suggestions available',
                    style: TextStyle(
                      color: subtitleColor,
                      fontSize: 16,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Try searching for friends by name or email',
                    style: TextStyle(
                      color: hintColor,
                      fontSize: 14,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadSuggestions,
      child: ListView.builder(
        controller: _scrollController,
        padding: const EdgeInsets.all(16),
        itemCount: suggestions.length,
        itemBuilder: (context, index) {
          final user = suggestions[index];
          final status = user['friendship_status'];
          final isOnline = user['is_online'] ?? false;
          final mutualCount = user['mutual_friends_count'] ?? 0;
          final mutualFriends = user['mutual_friends'] ?? [];

          return Card(
            margin: const EdgeInsets.only(bottom: 12),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
            color: isDarkMode ? const Color(0xFF1E1E1E) : Colors.white,
            child: ListTile(
              contentPadding: const EdgeInsets.all(12),
              leading: Stack(
                children: [
                  CircleAvatar(
                    radius: 28,
                    backgroundColor: isDarkMode ? Colors.grey[800] : Colors.blueGrey,
                    backgroundImage: user['avatar_url'] != null &&
                        user['avatar_url'].toString().isNotEmpty
                        ? NetworkImage(user['avatar_url'])
                        : null,
                    child: user['avatar_url'] == null ||
                        user['avatar_url'].toString().isEmpty
                        ? Text(
                            user['username'][0].toUpperCase(),
                            style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                              fontSize: 18,
                            ),
                          )
                        : null,
                  ),
                  if (isOnline)
                    Positioned(
                      bottom: 0,
                      right: 0,
                      child: Container(
                        width: 12,
                        height: 12,
                        decoration: BoxDecoration(
                          color: Colors.green,
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: Colors.white,
                            width: 2,
                          ),
                        ),
                      ),
                    ),
                ],
              ),
              title: Row(
                children: [
                  Expanded(
                    child: Text(
                      user['username'],
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                        color: textColor,
                      ),
                    ),
                  ),
                  _buildMutualFriendsChip(mutualCount),
                ],
              ),
              subtitle: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    user['email'] ?? '',
                    style: TextStyle(
                      color: subtitleColor,
                      fontSize: 13,
                    ),
                  ),
                  if (mutualCount > 0)
                    Padding(
                      padding: const EdgeInsets.only(top: 4),
                      child: _buildMutualFriendsList(
                        mutualFriends,
                        mutualCount,
                        isDarkMode,
                      ),
                    ),
                ],
              ),
              trailing: status != null
                  ? _buildStatusBadge(status)
                  : SizedBox(
                      width: 70,
                      child: ElevatedButton(
                        onPressed: () => _handleAddFriend(
                          user['id'],
                          user['username'],
                        ),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Theme.of(context).primaryColor,
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(20),
                          ),
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 8,
                          ),
                        ),
                        child: const Text(
                          'Add',
                          style: TextStyle(fontSize: 12),
                        ),
                      ),
                    ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildMutualFriendsList(
    List<dynamic> mutualFriends,
    int totalCount,
    bool isDarkMode,
  ) {
    if (mutualFriends.isEmpty) {
      return Text(
        '$totalCount mutual ${totalCount == 1 ? 'friend' : 'friends'}',
        style: TextStyle(
          fontSize: 12,
          color: isDarkMode ? Colors.white70 : Colors.grey[600],
        ),
      );
    }

    final names = mutualFriends.map((f) => f['username']).take(2).join(', ');

    String text;
    if (mutualFriends.length == 1) {
      text = 'Mutual friend: ${mutualFriends[0]['username']}';
    } else if (mutualFriends.length == 2) {
      text = 'Mutual friends: $names';
    } else {
      final remaining = totalCount - mutualFriends.length;
      text = 'Mutual friends: $names and ${remaining + (mutualFriends.length - 2)} others';
    }

    return Row(
      children: [
        Icon(
          Icons.people,
          size: 14,
          color: isDarkMode ? Colors.white70 : Colors.grey[600],
        ),
        const SizedBox(width: 4),
        Expanded(
          child: Text(
            text,
            style: TextStyle(
              fontSize: 12,
              color: isDarkMode ? Colors.white70 : Colors.grey[600],
              fontStyle: FontStyle.italic,
            ),
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }

  @override
  void dispose() {
    _searchController.dispose();
    _searchFocusNode.dispose();
    _scrollController.dispose();
    super.dispose();
  }
}