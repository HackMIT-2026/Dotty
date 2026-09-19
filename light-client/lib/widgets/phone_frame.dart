import 'package:flutter/material.dart';

import '../theme/app_theme.dart';

/// Keeps content at the 393 px design width when the app runs in a wide browser window.
/// With [underwater] set, Pip's pond scene fills the phone column, and on a wide window
/// a landscape version of the scene fills the space around it.
class PhoneFrame extends StatelessWidget {
  const PhoneFrame({super.key, required this.child, this.underwater = false});

  final Widget child;
  final bool underwater;

  static const _phoneAsset = 'assets/background/underwater.png';
  static const _wideAsset = 'assets/background/underwater_wide.png';

  Widget _scene(String asset, Alignment alignment) => Image.asset(
        asset,
        fit: BoxFit.cover,
        alignment: alignment,
        excludeFromSemantics: true,
        // Falls back to the cream page background if the file is missing.
        errorBuilder: (_, __, ___) => const SizedBox.shrink(),
      );

  @override
  Widget build(BuildContext context) {
    final wide = MediaQuery.sizeOf(context).width > AppSize.phoneWidth;
    return Scaffold(
      body: Stack(
        children: [
          if (underwater && wide) Positioned.fill(child: _scene(_wideAsset, Alignment.bottomCenter)),
          SafeArea(
            child: Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: AppSize.phoneWidth),
                child: Stack(
                  children: [
                    if (underwater) Positioned.fill(child: _scene(_phoneAsset, Alignment.bottomCenter)),
                    child,
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
