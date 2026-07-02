import 'package:flutter/material.dart';

class AuthTextField extends StatelessWidget {
  final TextEditingController controller;
  final String label;
  final String hintText;
  final TextInputType? keyboardType;
  final IconData? prefixIcon;
  final bool obscureText;
  final String? Function(String?)? validator;
  final void Function(String)? onChanged;
  final int? maxLines;
  final bool readOnly;
  final void Function()? onTap;
  final bool enabled;
  
  const AuthTextField({
    super.key,
    required this.controller,
    required this.label,
    required this.hintText,
    this.keyboardType,
    this.prefixIcon,
    this.obscureText = false,
    this.validator,
    this.onChanged,
    this.maxLines = 1,
    this.readOnly = false,
    this.onTap,
    this.enabled = true,
  });
  
  @override
  Widget build(BuildContext context) {
    final isDarkMode = Theme.of(context).brightness == Brightness.dark;
    final isDisabled = !enabled || readOnly;
    
    final labelColor = isDisabled
        ? (isDarkMode ? Colors.white38 : Colors.grey[400])
        : (isDarkMode ? Colors.white70 : Colors.grey[800]);
    
    final hintColor = isDisabled
        ? (isDarkMode ? Colors.white38 : Colors.grey[300])
        : (isDarkMode ? Colors.white54 : Colors.grey[400]);
    
    final iconColor = isDisabled
        ? (isDarkMode ? Colors.white38 : Colors.grey[400])
        : (isDarkMode ? Colors.white54 : Colors.grey[600]);
    
    final borderColor = isDarkMode ? Colors.white24 : Colors.grey[300]!;
    final fillColor = isDisabled
        ? (isDarkMode ? const Color(0xFF2C2C2C) : Colors.grey[100])
        : (isDarkMode ? const Color(0xFF2C2C2C) : Colors.white);
    
    final textColor = isDisabled
        ? (isDarkMode ? Colors.white54 : Colors.grey[600])
        : (isDarkMode ? Colors.white : Colors.black);
    
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
            fontWeight: FontWeight.w600,
            color: labelColor,
          ),
        ),
        const SizedBox(height: 8),
        TextFormField(
          controller: controller,
          keyboardType: keyboardType,
          obscureText: obscureText,
          validator: validator,
          onChanged: onChanged,
          maxLines: maxLines,
          readOnly: readOnly,
          onTap: onTap,
          enabled: enabled,
          style: TextStyle(
            color: textColor,
            fontSize: 16,
          ),
          decoration: InputDecoration(
            hintText: hintText,
            hintStyle: TextStyle(
              color: hintColor,
              fontSize: 14,
            ),
            prefixIcon: prefixIcon != null 
                ? Icon(prefixIcon, color: iconColor, size: 20) 
                : null,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(color: borderColor),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(color: borderColor),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(
                color: Theme.of(context).primaryColor, 
                width: 2,
              ),
            ),
            errorBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(
                color: isDarkMode ? Colors.red.shade400 : Colors.red,
                width: 1,
              ),
            ),
            focusedErrorBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(
                color: isDarkMode ? Colors.red.shade400 : Colors.red,
                width: 2,
              ),
            ),
            disabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(
                color: isDarkMode ? Colors.white24 : Colors.grey[200]!,
              ),
            ),
            filled: true,
            fillColor: fillColor,
            errorStyle: TextStyle(
              color: isDarkMode ? Colors.red.shade300 : Colors.red,
              fontSize: 12,
            ),
            contentPadding: const EdgeInsets.symmetric(
              horizontal: 16,
              vertical: 14,
            ),
          ),
        ),
      ],
    );
  }
}